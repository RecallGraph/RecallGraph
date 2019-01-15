'use strict';

const { db, aql } = require('@arangodb');
const gg = require('@arangodb/general-graph');
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../../helpers');
const { difference, values, find, fromPairs, chain, isString, concat, invokeMap } = require('lodash');
const minimatch = require('minimatch');
const expand = require('brace-expansion');

const GROUP_BY = Object.freeze({
  NODE: 'v.meta._id',
  COLLECTION: 'p.vertices[1][\'origin-for\']',
  EVENT: 'v.event'
});

const SORT_TYPES = Object.freeze({
  ASC: 'asc',
  DESC: 'desc'
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
  return isString(sortTypeKey) ? SORT_TYPES[sortTypeKey.toUpperCase()] : SORT_TYPES.DESC;
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
    if (skip) {
      return aql`limit ${skip}, ${limit}`;
    }
    else {
      return aql`limit ${limit}`;
    }
  }

  return aql.literal('');
};

exports.getSortingClause = function getSortingClause(sortType, groupBy, countsOnly) {
  const sortDir = getSortType(sortType);
  let sortExpr, primarySort = null, secSort;

  const groupExpr = getGroupExpr(groupBy);
  if (groupExpr) {
    secSort = `${groupBy} asc`;

    if (countsOnly) {
      primarySort = 'total';
    }
  }
  else {
    primarySort = 'v.ctime';
    secSort = 'v._id asc';
  }

  if (primarySort) {
    sortExpr = `sort ${primarySort} ${sortDir}, ${secSort}`;
  }
  else {
    sortExpr = `sort ${secSort}`;
  }

  return aql.literal(sortExpr);
};

exports.getTimeBoundFilters = function getTimeBoundFilters(since, until) {
  const filters = [];

  if (since) {
    filters.push(aql`filter v.ctime >= ${since}`);
  }
  if (until) {
    filters.push(aql`filter v.ctime <= ${until}`);
  }

  return filters;
};

exports.getGroupingClause = function getGroupingClause(groupBy, countsOnly) {
  const groupExpr = getGroupExpr(groupBy);
  if (groupExpr) {
    let groupingSuffix;

    if (countsOnly) {
      groupingSuffix = 'with count into total';
    }
    else {
      groupingSuffix = 'into events = keep(v, \'_id\', \'ctime\', \'event\', \'meta\')';
    }

    return aql.literal(`collect ${groupBy} = ${groupExpr} ${groupingSuffix}`);
  }

  return aql.literal('');
};

exports.getReturnClause = function getReturnClause(sortType, groupBy, countsOnly) {
  let returnClause = aql.literal('return keep(v, \'_id\', \'ctime\', \'event\', \'meta\')');

  const groupExpr = getGroupExpr(groupBy);
  if (groupExpr) {
    if (countsOnly) {
      returnClause = aql.literal(`return {${groupBy}, total}`);
    }
    else {
      const sortDir = getSortType(sortType);
      returnClause = aql.literal(`
        return {
          ${groupBy},
          events: (for ev in events sort ev.ctime ${sortDir} return ev)
        }
      `);
    }
  }

  return returnClause;
};