# CivicGraph

**A versioning data store for time-variant graph data.**

See this [**Demo App**](https://evening-lake-62717.herokuapp.com/) built using CivicGraph as the underlying time-versioned graph engine.

#### Core Metrics

[![Build Status](https://travis-ci.org/CivicGraph/CivicGraph.svg?branch=development)](https://travis-ci.org/CivicGraph/CivicGraph)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=alert_status)](https://sonarcloud.io/dashboard?id=adityamukho_evstore)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=coverage)](https://sonarcloud.io/component_measures?id=adityamukho_evstore&metric=coverage)

#### Additional Metrics

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=adityamukho_evstore)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=adityamukho_evstore)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=security_rating)](https://sonarcloud.io/dashboard?id=adityamukho_evstore)

---

## DISCLAIMER

- This project is under active development.
- Expect heavy feature churn and unstable builds in the initial days.
- **DO NOT** use in production systems until a stable build is announced!

## Introduction

CivicGraph is a 'versioned graph' data store - it retains all changes that its data (nodes and edges) have gone through to reach their current state. It is designed to eventually support graph traversals in time slices, letting the user query any past state of the graph just as easily as they can query the present state. The time slice could be a simple  _point in time_ or a _time range_, or a complex _inclusion/exclusion_ expression.

It is a [Foxx Microservice](https://www.arangodb.com/why-arangodb/foxx/) for [ArangoDB](https://www.arangodb.com/) that features _VCS-like_ semantics in many parts of its interface, and is backed by a transactional event tracker. It is currently being developed and tested on ArangoDB 3.4, with support for v3.5 in the works.

## Development Roadmap
1. Support for absolute/relative revision-based queries on individual nodes,
1. Branching/tag support,
1. Support for the _valid time_ dimension in addition to the currently implemented _transaction time_ dimension (https://www.researchgate.net/publication/221212735_A_Taxonomy_of_Time_in_Databases),
1. Support for ArangoDB 3.5,
1. Multiple, simultaneous materialized checkouts (a la `git`) of selectable sections of the database (entire DB, named graph, named collection, document list, document pattern), with eventual branch-level specificity,
1. CQRS/ES operation mode (async implicit commits),
1. Explicit commits,
1. Support for ArangoDB clusters (limited at present by lack of support for ACID transactions in clusters).

## Do I Need a 'Versioned Graph' Database?

To get an idea of where such a data store might be used, see:

1. [The Case for Versioned Graph Databases](https://adityamukho.com/the-case-for-versioned-graph-databases/),
1. [Illustrative Problems in Dynamic Network Analysis](https://en.wikipedia.org/wiki/Dynamic_network_analysis#Illustrative_problems_that_people_in_the_DNA_area_work_on)

**TL;DR:** CivicGraph is a potential fit for scenarios where data is characterized by inter-connected data points that change frequently (both in their individual attribute values and in their relations with each other), and whose past states are as important as their present, necessitating retention and queryability of their change history.

## Capabilities

Detailed API docs are available in the [project's wiki](https://github.com/adityamukho/CivicGraph/wiki/API). Additionally, contextual documentation is embedded in the built-in Swagger console.

### Document

- **(Implemented)** Create - Create single/multiple nodes (vertexes/edges).
- **(Implemented)** Replace - Replace entire single/multiple nodes with new content.
- **(Implemented)** Delete - Delete single/multiple nodes.
- **(Implemented)** Update - Add/Update specific fields in single/multiple nodes.

### Operations

- **(Planned)** Explicit Commits - Commit a node's changes separately, after it has been written to DB via other means (AQL/Core REST API/Client).
- **(Implemented)** Log - Fetch a filtered and optionally grouped log of events for a given path pattern (path determines scope of nodes to pick).
- **(Implemented)** Diff - Fetch a list of forward or reverse commands (diffs) between commit endpoints for specified nodes.
- **(Implemented)** Show - Fetch a set of nodes and edges, optionally grouped and filtered, that match a given path pattern, at a given point in time.

## Setting Up

### For Users

1. Download the [latest release](https://github.com/adityamukho/CivicGraph/releases/).
2. Follow the instructions in the [Foxx Deployment Manual](https://docs.arangodb.com/3.4/Manual/Foxx/Deployment.html). The web interface is the easiest, while the `foxx-cli` is more suitable for power users.
3. Try out the API endpoints through the Swagger console.

**Note:** A One-Click deployment option will be available soon for those who wish to give CivicGraph a spin without having to setup and deploy on their machines.

### For Contributors

For developers who wish to contribute to this project, see the [contribution guidelines](https://github.com/adityamukho/CivicGraph/blob/development/CONTRIBUTING.md) below for instructions on setting up a working dev environment on your machine. 

## Testing

**IMPORTANT:** Running tests will create some test collections apart from the usual service collections. This has a few caveats. **Carefully read the following points before running this service's test suites:**

1. Although test collections are namespaced using a prefix (the service mount point) in order to minimize chances of collision with user-defined collections, there is a small chance that it could still happen, especially when the same prefix is also used for user-defined collections.
2. Both service and test collections are populated with test data.
3. **Both service and test collections are truncated at the start of every test run!**

To avoid getting into trouble while testing, it is best to deploy this service to a blank database that isn't used for anything else, and then run the test suites there.

Run tests via the web interface or `foxx-cli`. Note that the tests take quite some time to finish, and only print their results in a batch at the end.

### Running Selective Tests

To run tests selectively on specific files or test suites, run

```
$ foxx run [options] <mount> runTests [args]
```

For a description on what `args` are available for the above command, see [here](https://gist.github.com/adityamukho/d1a042bb808d871d7d4ef0f266191867#file-usage-md).

## Docs

- Some documentation is already available through the Swagger interface.
- Detailed API docs are available [here](https://github.com/adityamukho/CivicGraph/wiki/API).
- Detailed technical documentation is actively being worked on, and will be available in the project wiki very soon.

## Limitations

1. Although the test cases are quite extensive and have good coverage, this service has only been tested on single-instance DB deployments, and **not on clusters**.
2. As of version 3.4, ArangoDB does not support ACID transactions in [cluster mode](https://docs.arangodb.com/3.4/Manual/Transactions/Limitations.html#in-clusters), transactional ACIDity is not guaranteed for such deployments.

## Get in Touch

- Raise an issue or PR on this repo, or
- Mail me (email link in Github profile), or
- Join the Gitter channel - [https://gitter.im/CivicGraph/community](https://gitter.im/CivicGraph/community).
