# CivicGraph

Previously, _evstore_.

**A versioning data store for time-variant graph data.**

#### Core Metrics

[![Build Status](https://travis-ci.org/CivicGraph/CivicGraph.svg?branch=development)](https://travis-ci.org/adityamukho/CivicGraph)
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

CivicGraph is a temporal graph data store - it retains all changes that its data have gone through to reach their current state. It is designed to support graph traversals in time slices, letting the user query any past state of the graph just as easily as they can query the present state. The time slice could be a simple  _point in time_ or a _time range_, or a complex _inclusion/exclusion_ expression.

It is a [Foxx Microservice](https://www.arangodb.com/why-arangodb/foxx/) for [ArangoDB](https://www.arangodb.com/) that features _VCS-like_ semantics in many parts of its interface, and is backed by a transactional event tracker.

To get an idea of where such a data store might be used, see [The Case for Versioned Graph Databases](https://adityamukho.com/the-case-for-versioned-graph-databases/).

**TL;DR:** CivicGraph is a potential fit for situations where there are data with highly dynamic inter-connections whose past states are as important as their present, and hence necessitate retention and queryability.

## Quick Technical Overview

This quick overview is intended to introduce the user to some high level concepts that would let them get started with the service. A more detailed technical document will soon be made available in the project's wiki.

CivicGraph exposes multiple write methods for individual/multiple nodes (documents/edges). Supported write method contracts (current and planned) are intended to closely follow the core REST API that ArangoDB already exports. These include:

1. Create (POST)
2. Replace (PUT)
3. Update (PATCH)
4. Delete (DELETE)

Node read methods would be no different from what the core REST API already provides, and so they are left out the microservice.

When a write method is invoked on a node, the following things happen behind the scenes:

1. A transaction is opened with read and write (non-exclusive) locks on appropriate collections.
2. The provided node is written.
3. An event object corresponding to the write is created, that records the current time, event type (create/update/delete) and some meta information about the node. This event is appended to a service-managed **document** collection.
4. A command object is created using [JSON Patch (RFC6902)](https://tools.ietf.org/html/rfc6902) to compute a reversible diff from the last known state (`{}` by default) to the current state of the node. This command is appended to a service-managed **edge** collection, linking the current event to the last one (an `origin` event by default).
5. The transaction is committed.

If something goes wrong at any step in the above process, the transaction is rolled back.

This way, every time something happens to a node (a create/update/delete event), a permanent, immutable record of that event is stored forever in the database. These records can be queried in different ways to either:

- view a node's mutation history, or
- rewind a node to any point in time in its mutation history, or
- even bring a deleted node back to life!

In the background, recurring cron jobs are executed to create periodic snapshots from event lists, and a skeleton graph that records a history of structural changes to the main data. Snapshots, when available, are used on a best-effort basis to reduce the number of diff calculations required to perform a rewind/fast-forward. The skeleton graph is used to run traversals on historical versions of the main data.

**The process described above makes the implicit assumption that all mutation methods for a node were invoked through CivicGraph's API, allowing it to record all changes, and no direct modifications happened.** But what if somehow, a node underwent a few direct mutations via other means (AQL/Core REST API/Client)?

Not all is lost in this case, since CivicGraph, like Git, supports a **commit** operation that lets you explicitly add an event record post hoc. Obviously, this would create only a single diff from the last known state to the current state, and any intermediate mutations would collapse into that diff. Unfortunately, there is no way around this.

CivicGraph manages all its bookkeeping in a set of service-managed collections, and does not write anything to user-defined collections, other than the specific node records that the user explicitly asked to save. This means that the user gets a clean view of their own collections/data, not polluted by any service metadata (just like Git's working tree). They can query this data as though the service is not even there!

## Salient API Features

Detailed API docs are available in the [project's wiki](https://github.com/adityamukho/CivicGraph/wiki/API). Additionally, contextual documentation is embedded in the built-in Swagger console.

### Document

- **(Implemented)** Create - Create single/multiple nodes (vertexes/edges)
- **(Implemented)** Replace - Replace entire single/multiple nodes with new content
- **(Implemented)** Delete - Delete single/multiple nodes
- **(Implemented)** Update - Add/Update specific fields in single/multiple nodes

### Operations

- **(Planned)** Explicit Commits - Commit a node's changes separately, after it has been written to DB via other means (AQL/Core REST API/Client)
- **(Implemented)** Log - Fetch a filtered and optionally grouped log of events for a given path pattern (path determines scope of nodes to pick)
- **(Planned)** Diff - Fetch a list of forward or reverse commands (diffs) between commit endpoints for specified nodes (might use `log` behind the scenes)
- **(Planned)** Patch - Apply a set of diffs to specified nodes to rewind/fast-forward them in time (will use `diff` behind the scenes)

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
