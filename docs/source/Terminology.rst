This page contains a glossary of terms defined in the context of
*RecallGraph*. Understanding these terms is a prerequisite to following
the API docs and using the service effectively.

Event Log
=========

In order to keep track of changes to all documents (vertices/edges),
*RecallGraph* maintains a log of all write events (create/update/delete)
that occur on each document through its interface. This log is built
along the lines of the `event sourcing
pattern <https://docs.microsoft.com/en-us/azure/architecture/patterns/event-sourcing>`__.

It is comprised of the following components:

Event
-----

An event is a record of a write operation pertaining to a single
document (vertex/edge) that takes place through *RecallGraph*'s API. The
write operation is one of *create*, *update*, or *delete*. An event
object contains information on a number of parameters related to the
write op:

1. The ``_id``, ``_key`` and ``_rev`` of the document which was written.
2. The *type* of event - one of ``created``, ``updated`` or ``deleted``.
3. The UNIX timestamp (in seconds) of the instant when the write
   happened. This is also referred to as the **transaction time**.
   Decimal precision - 5 decimal points, ie., 0.1μs.
4. The sequence number of the write operation - this tracks the number
   of times this document was written, including creates, updates and
   deletes.
5. Distance from last `snapshot <#Snapshot>`__.
6. Distance to next `snapshot <#Snapshot>`__ (which may or may not exist
   yet).

Diff
----

A reversible delta between two JSON objects, computed using the `JSON
Patch (RFC6902) <https://tools.ietf.org/html/rfc6902>`__ standard. This
delta itself is represented as a JSON array of objects. For more
information on its schema/format, refer to the aforementioned link.

Command
-------

A container for a single (forward) `Diff <#Diff>`__ array. This is the
storage unit for the difference between two successive
`events <#Event>`__ that occur on a single document (vertex/edge). The
command also contains a reference to the ``_id`` of the document whose
change it records. Every event is associated with a corresponding
command that records the changes caused by that event.

Special Cases
~~~~~~~~~~~~~

1. When a document is first created, its command diff is computed from
   an empty JSON object (``{}``) to the document's JSON representation.
2. When a document is deleted, its command diff is computed from the
   document's last JSON representation to an empty JSON object (``{}``).

Snapshot
--------

After every configurable number of write `events <#Event>`__ on a
document, a snapshot of the current state of the document is recorded in
its entirety. This can later be used to quickly rebuild a document's
state at a particular point in the past, without having to replay all
the events starting from the creation of the document upto that instant.

Instead, if a nearby snapshot is found (before or after the instant), it
can be used as a starting point from where to replay the events, thus
saving some computation time. In case the snapshot is in the future
w.r.t. the instant asked for, the events are replayed in reverse
chronological order, with their corresponding `diffs <#Diff>`__ being
first reversed before being applied.

Patterns
========

Pattern strings are used in several places throughout the API to match
against a set of resources. Other than the commonplace `regex
pattern <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions>`__,
*RecallGraph*'s API heavily relies on two other patterns:

Glob Pattern
------------

A string containing a pattern that is accepted by
`minimatch <https://realguess.net/2014/07/05/extended-pattern-matching/>`__
(extglob, globstar, brace expansion and any valid combinations thereof).

Brace Pattern
-------------

A string containing a valid `brace expansion
pattern <https://www.npmjs.com/package/brace-expansion>`__.

Scopes
======

Many of *RecallGraph*'s queries are executed within the confines of a
*scope*. A *scope* defines a **restriction boundary** on the data that
should considered for a query. There are 5 types of scope.

Database Scope
--------------

This is essentially an unrestricted scope, i.e. it allows the entire
database to be scanned during the query (barring *RecallGraph*'s own
service collections).

Graph Scope
-----------

This scope restricts the query to only look within the collections that
belong to one or more (named) graphs whose names match a specified `glob
pattern <#Glob-Pattern>`__ (barring *RecallGraph*'s own service graphs).
The pattern is passed as a query parameter.

Collection Scope
----------------

This scope restricts the query to only look within collections whose
names match a specified `glob pattern <#Glob-Pattern>`__ (barring
*RecallGraph*'s own service collections). The pattern is passed as a
query parameter.

Node-Glob Scope
---------------

This scope restricts the query to only look within those documents
(vertex/edge) whose ``_id`` matches a specified `glob
pattern <#Glob-Pattern>`__ (barring documents within *RecallGraph*'s own
service collections). The pattern is passed as a query parameter.

Node-Brace Scope
----------------

This scope restricts the query to only look within those documents
(vertex/edge) whose ``_id`` matches a specified `brace
pattern <#Brace-Pattern>`__ (barring documents within *RecallGraph*'s
own service collections). The pattern is passed as a query parameter.

Path
====

A pattern used to select a particular scope to scan. This is not to be
confused with a `graph traversal
path <https://www.arangodb.com/docs/stable/aql/graphs-traversals-explained.html>`__.
In this context, *path* refers to the UNIX directory-like navigation
pointers that the patterns resemble. These are defined as follows:

1. ``/`` - **The root path**. This tells the log builder to basically
   pick everything - the entire database for logging - every
   user-defined collection and every document (vertex/edge) (existing
   and deleted) therein. This is essentially the `Database
   Scope <#Database-Scope>`__.
2. ``/g/<glob pattern>`` - **Named Graph**. A path that starts with
   ``/g/`` followed by a valid `glob pattern <#Glob-Pattern>`__. This is
   essentially the `Graph Scope <#Graph-Scope>`__.
3. ``/c/<glob pattern>`` - **Collection**. A path that starts with
   ``/c/`` followed by a valid `glob pattern <#Glob-Pattern>`__. This is
   essentially the `Collection Scope <#Collection-Scope>`__.
4. ``/ng/<glob pattern>`` - **Node Glob**. A path that starts with
   ``/ng/`` followed by a valid `glob pattern <#Glob-Pattern>`__. This
   is essentially the `Node-Glob Scope <#Node-Glob-Scope>`__.
5. ``/n/<brace pattern>`` - **Node Brace**. A path that starts with
   ``/n/`` followed by a valid `brace pattern <#Brace-Pattern>`__. This
   is essentially the `Node-Brace Scope <#Node-Brace-Scope>`__. This is
   much faster than a node-glob scan, and should be the preferred
   document selection pattern wherever possible.

Filter
======

In many queries that the *RecallGraph* API supports, filters can be
applied to restrict the results that are returned. These filters are
classified according to whether they apply within a running DB query, or
during post-processing steps on the query results (defined in the
service code, running in a V8 context).

Pre-Filter
----------

A pre-filter is a filter that is applied at the time of running a DB
query.

Pre-filters supported by *RecallGraph* include the `path <#Path>`__
parameter and the time interval bounds that several API endpoints
accept.

Post-Filter
-----------

Once a query returns some results, a post-filter can be applied on them
to further restrict the number of matching results that are returned.
These filters are executed within service code executed in a V8 context.

The only type of post-filter supported by *RecallGraph* is a string
containing any Javascript-like expression that is supported by
`jsep <http://jsep.from.so/>`__, with a few extensions defined below.

**Important:** *jsep* does not support object literals, only array
literals. This may be fixed in a fork, maintained by *RecallGraph*, in
the future.

*jsep* Extensions
~~~~~~~~~~~~~~~~~

Operators
^^^^^^^^^

1. ``=~`` - **Regex Match**. Filters on a regex pattern. The left
   operand must `match the regex
   pattern <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test>`__
   given in the right operand for the filter to pass.
2. ``=*`` - **Glob Match**. Filters on a `glob
   pattern <#Glob-Pattern>`__. The left operand must match the glob
   pattern given in the right operand for the filter to pass.
3. ``in`` - **Array Search**. Filters on an array search. The left
   operand must be present in the array provided in the right operand.
   **Deep comparison** is performed for each element of the right
   operand against the left operand.
4. ``**`` - **Exponentiation**. Returns the left operand raised to the
   power right operand.

.. _special-handling-for----and-:

Special Handling for ``==``, ``===``, ``!=`` and ``!==``
''''''''''''''''''''''''''''''''''''''''''''''''''''''''

1. ``==, ===`` - **Deep Equality**. Filters on deep equality. The left
   operand must be **deeply equal** to the right operand. Both ``==``
   and ``===`` behave identically.
2. ``!=, !==`` - **Deep Inequality**. Filters on deep inequality. The
   left operand must **NOT** be **deeply equal** to the right operand.
   Both ``!=`` and ``!==`` behave identically.

Functions
^^^^^^^^^

Binary Functions
''''''''''''''''

1. ``eq(left, right)`` - **Deep Equality**. Filters on deep equality.
   See
   `https://lodash.com/docs/4.17.15#isEqual <https://lodash.com/docs/4.17.15#isEqual>`__.
2. ``lt(left, right)`` - **'Less Than' Comparison**. Filters on strict
   inequality. The ``left`` operand must be strictly less than the
   ``right`` operand. See
   `https://lodash.com/docs/4.17.15#lt <https://lodash.com/docs/4.17.15#lt>`__.
3. ``gt(left, right)`` - **'Greater Than' Comparison**. Filters on
   strict inequality. The ``left`` operand must be strictly greater than
   the ``right`` operand. See
   `https://lodash.com/docs/4.17.15#gt <https://lodash.com/docs/4.17.15#gt>`__.
4. ``lte(left, right)`` - **'Less Than or Equals' Comparison**. Filters
   on non-strict inequality. The ``left`` operand must be less than or
   equal to the ``right`` operand. See
   `https://lodash.com/docs/4.17.15#lte <https://lodash.com/docs/4.17.15#lte>`__.
5. ``gte(left, right)`` - **'Greater Than or Equals' Comparison**.
   Filters on non-strict inequality. The ``left`` operand must be
   greater than or equal to the ``right`` operand. See
   `https://lodash.com/docs/4.17.15#gte <https://lodash.com/docs/4.17.15#gte>`__.
6. ``typeof(val)`` - **Type Identifier**. Returns the type of ``val`` as
   per the specification defined at `MDN Web
   Docs <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof>`__.
7. ``in(needle, haystack)`` - **Array Search**. Filters on an array
   search. The ``needle`` operand must be present in the array provided
   in the ``haystack`` operand. **Deep comparison** is performed for
   each element of ``haystack`` against ``needle``.
8. ``glob(string, pattern)`` - **Glob Match**. Filters on a `glob
   pattern <#Glob-Pattern>`__. The ``string`` operand must match the
   glob pattern given in the ``pattern`` operand for the filter to pass.
9. ``regx(string, pattern)`` - **Regex Match**. Filters on a regex
   pattern. The ``string`` operand must `match the regex
   pattern <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test>`__
   given in the ``pattern`` operand for the filter to pass.

Ternary Functions
'''''''''''''''''

1. ``all(op, array, value)`` - **Array 'All Match'**. Filters on an
   array 'all match'. Every element ``el`` in ``array`` must satisfy the
   ``op(el, value)`` function filter, where ``op`` is one of the above
   `binary function filters <#Binary-Functions>`__.
2. ``any(op, array, value)`` - **Array 'Any Match'**. Filters on an
   array 'any match'. At least one element ``el`` in ``array`` must
   satisfy the ``op(el, value)`` function filter, where ``op`` is one of
   the above `binary function filters <#Binary-Functions>`__.

.. _special-handling-for-math---experimental:

Special Handling for ``Math.*`` - EXPERIMENTAL!
'''''''''''''''''''''''''''''''''''''''''''''''

All exposed properties and methods of the built-in
`Math <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math>`__
object are correctly recognized and processed.

A consequent **CAVEAT** is that in the intermediate result array (the DB
query results), any object with field/s (top-level or nested) having the
name ``Math`` will **NOT** be processed normally. This behaviour is
experimental, and subject to change in future versions.
