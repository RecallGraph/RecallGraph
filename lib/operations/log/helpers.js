'use strict';

const { db, aql } = require('@arangodb');
const gg = require('@arangodb/general-graph');
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../../helpers');
const { difference, values, find, fromPairs, chain, isString, concat, invokeMap } = require('lodash');
const minimatch = require('minimatch');
const expand = require('brace-expansion');

const GROUP_BY = Object.freeze({
  NODE: aql.literal('collect grp = v.meta._id'),
  COLLECTION: aql.literal('collect grp = regex_split(v.meta._id, "/")[0]'),
  EVENT: aql.literal('collect grp = v.event')
});

const SORT_TYPES = Object.freeze({
  ASC: aql.literal('asc'),
  DESC: aql.literal('desc')
});

function getGraphCollectionNamesMap(graphNames) {
  return chain(graphNames)
    .map(name => {
      const graph = gg._graph(name);
      const collections = invokeMap(concat(graph._vertexCollections(), graph._edgeCollections()), 'name');

      return [name, collections];
    })
    .thru(fromPairs);
}

function getMatchingCollNames(graphNames, matches) {
  const graphCollectionNamesMapWrapper = getGraphCollectionNamesMap(graphNames);

  return graphCollectionNamesMapWrapper.at(matches).flatten().uniq().value();
}

function getNonServiceCollections() {
  return difference(db._collections().map(coll => coll.name()), values(SERVICE_COLLECTIONS));
}

function getDBScope() {
  return {
    pathPattern: '/'
  };
}

function getGraphScope() {
  return {
    pathPattern: '/g/*',
    prefix: '/g/',
    filters: (searchPattern) => {
      const graphNames = difference(gg._list(), values(SERVICE_GRAPHS));
      const matches = minimatch.match(graphNames, searchPattern);
      const collNames = getMatchingCollNames(graphNames, matches);

      return aql`filter p.vertices[1]['origin-for'] in ${collNames}`;
    }
  };
}

function getCollectionScope(collections) {
  return {
    pathPattern: '/c/*',
    prefix: '/c/',
    filters: (searchPattern) => {
      const matches = minimatch.match(collections, searchPattern);

      return aql`filter p.vertices[1]['origin-for'] in ${matches}`;
    }
  };
}

function getNodeGlobScope() {
  return {
    pathPattern: '/ng/**',
    prefix: '/ng/',
    filters: (searchPattern) => {
      const idPattern = minimatch.makeRe(searchPattern).source;

      return aql`filter regex_test(p.vertices[2].meta._id, ${idPattern})`;
    }
  };
}

function getNodeBraceScope(collections) {
  return {
    pathPattern: '/n/**',
    prefix: '/n/',
    filters: (searchPattern) => {
      const collMatches = chain(expand(searchPattern))
        .map(pattern => pattern.split('/')[0])
        .intersection(collections)
        .value();

      return aql`
        let collName = p.vertices[1]['origin-for']
        filter collName in ${collMatches}
        filter p.edges[1].meta._key in keyGroups[collName]
      `; //See initializers below for keyGroups definition.
    },
    initializers: (searchPattern) => {
      const idMatchesWrapper = chain(expand(searchPattern));
      const collMatches = idMatchesWrapper.map(pattern => pattern.split('/')[0]).intersection(collections).value();
      const keyGroups = idMatchesWrapper
        .map(match => match.split('/'))
        .filter(matchPair => collMatches.includes(matchPair[0]))
        .transform((groups, matchPair) => {
          const group = matchPair[0];
          groups[group] = groups[group] || [];
          groups[group].push(matchPair[1]);
        }, {})
        .value();

      return aql`let keyGroups = ${keyGroups}`;
    }
  };
}

function getAvailableScopes(collections) {
  return {
    database: getDBScope(),
    graph: getGraphScope(),
    collection: getCollectionScope(collections),
    nodeRegex: getNodeGlobScope(),
    nodeExact: getNodeBraceScope(collections)
  };
}

function getSortType(sortTypeKey) {
  return isString(sortTypeKey) && SORT_TYPES[sortTypeKey.toUpperCase()];
}

function getGroupExpr(groupByKey) {
  return isString(groupByKey) && GROUP_BY[groupByKey.toUpperCase()];
}

exports.getScopeFor = function getScopeFor(path) {
  const collections = getNonServiceCollections();
  const scopes = getAvailableScopes(collections);

  return find(scopes, (scope) => minimatch(path, scope.pathPattern));
};

exports.getSearchPattern = function getSearchPattern(scope, path) {
  return scope.prefix ? path.substring(scope.prefix.length) : path;
};

exports.getScopeFilters = function getScopeFilters(scope, searchPattern) {
  return scope.filters ? scope.filters(searchPattern) : aql.literal('');
};

exports.getScopeInitializers = function getScopeInitializers(scope, searchPattern) {
  return scope.initializers ? scope.initializers(searchPattern) : aql.literal('');
};

exports.getLimitClause = function getLimitClause(limit, skip) {
  if (limit) {
    let limitPrefix = aql.literal('limit');

    let skipSuffix;
    if (skip) {
      skipSuffix = aql`${skip},`;
    }
    else {
      skipSuffix = aql.literal('');
    }

    const limitSuffix = aql`${limit}`;

    return aql.join([limitPrefix, skipSuffix, limitSuffix]);
  }
  else {
    return aql.literal('');
  }
};

exports.getSortingClause = function getSortingClause(sortType, groupBy, countsOnly) {
  const sortDir = getSortType(sortType);
  if (sortDir) {
    let sortingField = aql.literal('v.ctime');

    const groupExpr = getGroupExpr(groupBy);
    if (groupExpr) {
      if (countsOnly) {
        sortingField = aql.literal('total');
      }
      else {
        sortingField = aql.literal('length(events)');
      }
    }

    return aql`sort ${sortingField} ${sortDir}`;
  }

  return aql.literal('');
};

exports.getGroupingClause = function getGroupingClause(groupBy, countsOnly) {
  const groupingParts = [aql.literal('')];

  const groupExpr = getGroupExpr(groupBy);
  if (groupExpr) {
    groupingParts.push(groupExpr);

    if (countsOnly) {
      groupingParts.push(aql`with count into total`);
    }
    else {
      groupingParts.push(aql`into events = keep(v, '_id', 'ctime', 'event', 'meta')`);
    }
  }

  return aql.join(groupingParts);
};
