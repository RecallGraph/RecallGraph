|Logo|

.. _recallgraph---a-versioning-data-store-for-time-variant-graph-data:

RecallGraph - A versioning data store for time-variant graph data.
==================================================================

RecallGraph is a *versioned-graph* data store - it retains all changes
that its data (vertices and edges) have gone through to reach their
current state. It supports *point-in-time* graph traversals, letting the
user query any past state of the graph just as easily as the present.

It is a `Foxx
Microservice <https://www.arangodb.com/why-arangodb/foxx/>`__ for
`ArangoDB <https://www.arangodb.com/>`__ that features *VCS-like*
semantics in many parts of its interface, and is backed by a
transactional event tracker. It is currently being developed and tested
on ArangoDB v3.5, with support for v3.6 in the pipeline.

--------------

|Build Status| |Quality Gate Status| |Coverage| |Maintainability Rating| |Reliability Rating| |Security Rating|

--------------

Contents
========

.. toctree::
   :maxdepth: 2

   Home
   Installation
   Terminology

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

.. |Logo| image:: ../../assets/RecallGraph-Inline.jpeg
.. |Build Status| image:: https://travis-ci.org/RecallGraph/RecallGraph.svg?branch=development
   :target: https://travis-ci.org/RecallGraph/RecallGraph
.. |Quality Gate Status| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=alert_status
   :target: https://sonarcloud.io/dashboard?id=adityamukho_evstore
.. |Coverage| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=coverage
   :target: https://sonarcloud.io/component_measures?id=adityamukho_evstore&metric=coverage
.. |Maintainability Rating| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=sqale_rating
   :target: https://sonarcloud.io/dashboard?id=adityamukho_evstore
.. |Reliability Rating| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=reliability_rating
   :target: https://sonarcloud.io/dashboard?id=adityamukho_evstore
.. |Security Rating| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=security_rating
   :target: https://sonarcloud.io/dashboard?id=adityamukho_evstore
