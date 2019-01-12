'use strict';

const { db, aql } = require('@arangodb');
const gg = require('@arangodb/general-graph');
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../../helpers');
const { difference, values, find, fromPairs, chain, isString, concat, invokeMap } = require('lodash');
const minimatch = require('minimatch');
const expand = require('brace-expansion');

const GROUP_BY = Object.freeze({
  NODE: aql`collect grp = v.meta._id`,
  COLLECTION: aql`collect grp = regex_split(v.meta._id, '/')[0]`,
  EVENT: aql`collect grp = v.event`
});

const SORT_TYPES = Object.freeze({
  ASC: aql.literal`asc`,
  DESC: aql.literal`desc`
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

exports.getScopeFor = function getScopeFor(path) {
  const collections = getNonServiceCollections();
  const scopes = getAvailableScopes(collections);

  return find(scopes, (scope) => minimatch(path, scope.pathPattern));
};

exports.getSearchPattern = function getSearchPattern(scope, path) {
  return scope.prefix ? path.substring(scope.prefix.length) : path;
};

exports.getScopeFilters = function getScopeFilters(scope, searchPattern) {
  return scope.filters ? scope.filters(searchPattern) : aql``;
};

exports.getScopeInitializers = function getScopeInitializers(scope, searchPattern) {
  return scope.initializers ? scope.initializers(searchPattern) : aql``;
};

exports.getLimitClause = function getLimitClause(limit, skip) {
  if (limit) {
    let limitPrefix = aql`limit`;

    let skipSuffix;
    if (skip) {
      skipSuffix = aql`${skip},`;
    }
    else {
      skipSuffix = aql``;
    }

    const limitSuffix = aql`${limit}`;

    return aql.join([limitPrefix, skipSuffix, limitSuffix]);
  }
  else {
    return aql``;
  }
};

exports.getSortingClause = function getSortingClause(sortingKey, sortingField) {
  if (isString(sortingKey)) {
    const sortType = SORT_TYPES[sortingKey.toUpperCase()];
    if (sortType) {
      return aql`sort ${sortingField} ${sortType}`;
    }
  }

  return aql``;
};

exports.getGroupingClauseAndSortingField = function getGroupingClauseAndSortingField(groupingKey, countsOnly) {
  let sortingField = aql.literal`v.ctime`;
  const groupingParts = [aql``];

  if (isString(groupingKey)) {
    const groupExpr = GROUP_BY[groupingKey.toUpperCase()];
    if (groupExpr) {
      groupingParts.push(groupExpr);
      if (countsOnly) {
        groupingParts.push(aql`with count into total`);
        sortingField = aql.literal`total`;
      }
      else {
        groupingParts.push(aql`into events = keep(v, '_id', 'ctime', 'event', 'meta')`);
        sortingField = aql.literal`length(events)`;
      }
    }
  }

  return { sortingField, groupingClause: aql.join(groupingParts) };
};
