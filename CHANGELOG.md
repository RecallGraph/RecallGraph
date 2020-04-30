# 1.0.0
## Added
1. `sphinx` doc root.
2. Post-filter in _read_ endpoints - `log`, `diff`, `show`.
3. _k Shortest Paths_ - Custom-weighted, point-in-time, shortest paths between endpoints.
4. Synchronous skeleton graph updates within commit transactions.
5. [OpenTracing](https://opentracing.io/) instrumentation, using ancilliary [collector](https://github.com/RecallGraph/foxx-tracer-collector) foxx service. **Non-intrusive and strictly optional.**
6. **Data:**
    1. Event objects have a `collection` field to identify the collection to which their corresponding document belongs.
    2. Migration script to automatically upgrade event trees created using older versions.
    3. Migration script to remove stale indices.
7. Logs can be grouped by _type_ (vertex/edge).


## Removed
1. Dedicated `filter` endpoint. All read endpoints now have their own filtering capability.
2. Asyncrhonous skeleton graph updates in cron jobs.
3. **Breaking:**
    1. `returnCommands` parameter removed from `log`. Anything that depended on this should now used the enhanced `diff` endpoint instead.
    2. `groupSkip` and `groupLimit` removed from `diff` endpoint, as they were deemed _not useful_. The newly availbale post-filter param can indirectly help make up for the deficit in most cases.
4. **Bug**:
    1. Sort direction was not being honoured in `log` when `groupBy` was specified. This has been fixed.
    2. Hardcoded service collection name in a query for `show` was removed.
    3. `traverse` no longer breaks if starting vertex is not found.
5. Service collection suffixes are no longer configurable (extraneous config).

## Changed
1. **Data:**
    1. Collection origin events have their `origin-for` field renamed to `collection` to remain consistent with field naming convention followed for regular events.
    2. Certain indices have changed.
2. Diffs are enhanced to return some event metadata along with command lists. This is to reduce overloading the `log` function with event+command-related queries.
3. The `countsOnly` parameter now has an effect even when `groupBy` is `null` for `log ` endpoints. It returns the overall total number of events based on the filters provided.
4. `show` returns an array with total count when `groupBy` is `null`, instead of a bare object. This is for consistent post-filter application semantics.
5. `traverse` `minDepth` has been changed to `1`.



