Introduction
============

What are Graph Datastores?
--------------------------

Graph databases have become ubiquitous over the years due to their
incredible representational and querying capabilities, when it comes to
highly interconnected data. Wherever data has an inherent networked
structure, graph databases fare better at storing and querying that data
than other NoSQL databases as well as relational databases, because they
naturally persist the underlying connected structure. This allows for
traversal semantics in declarative graph query languages, and also,
better performance than SQL - especially for deep traversals.
Additionally, they often help unravel emergent network topologies in
legacy data, that had not previously been mined for such structures. At
the very least, they make the process a lot less tedious.

Versioned Graph Stores
----------------------

In addition to reaping the benefits of living in graph databases, many
real world applications also stand to take advantage of network
evolution models, i.e. a record of changes to a network over time; for
example, analyzing railway track utilization efficiency as a function of
signal array timing, or the simulation of nucleotide concentration
changes over time in a nuclear fission reactor. However, in most of the
prominent mainstream graph databases that are freely available at the
time of this writing, I have not come across any that offer some sort of
built-in revision tracking (meaning older versions of data are retained
for future retrieval).

Particularly for graph databases, the concept of revisions applies not
only to individual nodes and edges, but also to the structure of the
graph as a whole, i.e. it should be relatively easy to store and
retrieve not only individual document (node/edge) histories, but also
the structural history of the graph or a portion of it. This is a key
difference between a hypothetical versioned or historical graph database
and a general purpose event store, which is usually tuned for the former
but not the latter.

There is a need for a practical, historical graph database that has the
following minimal set of characteristics:

1. A mechanism for efficiently recording individual document (node/edge)
   writes (creates/updates/deletes) in such a way that they can be
   rewound and replayed.
2. An internal storage architecture that not only maintains the current
   structure of the graph, but also allows for a quick rebuild and
   retrieval of its structure at any point of time in the past. This
   could, optionally, be optimized to retrieve recent structures faster
   than older ones.
3. An efficient query engine that can traverse current/past graph
   structures to retrieve subgraphs or k-hop neighborhoods of specified
   nodes. In case of historical traversals, this should be optimized to
   rebuild only the relevant portions of the graph, where feasible.

About ArangoDB
==============

`ArangoDB <https://www.arangodb.com/>`__ is a `free and
open-source <https://en.wikipedia.org/wiki/Free_and_open-source>`__
native `multi-model
database <https://en.wikipedia.org/wiki/Multi-model_database>`__ system
developed by ArangoDB GmbH. The database system supports three data
models (key/value, documents, graphs) with one database core and a
unified query language AQL (ArangoDB Query Language). The query language
is declarative and allows the combination of different data access
patterns in a single query. ArangoDB is a NoSQL database system but AQL
is similar in many ways to SQL.

ArangoDB has been referred to as a universal database but its creators
refer to it as a "native multi-model" database to indicate that it was
designed specifically to allow key/value, document, and graph data to be
stored together and queried with a common language.

Why RecallGraph?
================

Built-In *Transaction Time* Dimension
-------------------------------------

There is a general consensus in the computing and scientific research
community for the need of a historical graph database. A database that
records entity write operations (creates/updates/deletes) as a series of
deltas wrapped in events. Each delta is the difference between the
contents of the updated entity and its previous version. It is part of
an event payload, where the event represents the particular write
operation (create/update/delete) that occurred. Thus, deltas encode the
entire write history of the entity. RecallGraph was developed to fulfill
this.

(Planned) Built-In *Valid Time* Dimension
-----------------------------------------

TODO.
