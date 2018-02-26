## Meteor Server-Client Time Sync

This package provides an automatic server-client time sync. In other words it constantly tries to keep the client time synchronized with server.
The time sync accuracy is very high ~20ms. By default 10 time measurements are made through the websocket connection. This can be adjusted to up/down for higher/lower accuracy.   

### Client API

```
/**
 * True if time is synchronized with server.
 * @returns {boolean}
 */
TimeSync.isSynced();

/**
 * Returns current time offset.
 * @returns {number}
 */
TimeSync.getOffset();

/**
 * Returns an unix timestamp like Date.now() but the time is synchronized with server.
 * @returns {number}
 */
TimeSync.now();

/**
 * Sets a callback for the initial sync. 
 */
TimeSync.onInitialSync((offset) => {});

/**
 * Sets a callback for every sync. 
 */
TimeSync.onSync((offset) => {});

/**
 * Start the time change detection.
 * Example: interval = 10000 (10sec), threshold = 10 (%)
 * It will run time sync when the time passed between timer ticks is above 11000 or below 9000 ms so the time was
 * shifted by 1 sec in any direction.
 * This only makes sense if the interval here is much lower than the server side interval for auto sync.
 
 * @param {number=} interval - how often perform the check (60000 by default)
 * @param {number=} threshold - threshold in % (15% by default)
 */
TimeSync.startTimeChangeDetection(interval, threshold);
   
```

### Server API

```

// Starts time sync mechanism on the server.
TimeSync.configure(options)

// default options:
{
    // how many messages exchange perform with each client,
    // higher means more traffic and CPU (server side) but brings higher accuracy
    maxSampleCount: 10, 
    // if above 0, the next time sync sample message will be deffered by this delay in ms
    // this might reduce the load on the server CPU but will increase memeory ussage
    timeDelayBetweenRequests: 0,
    // by default server will try to synchronize all clients within every minute
    syncInterval: 60000,
    // how much clients should be synchronized in one group
    // lower will reduce CPU but increase memory consumption on the server
    syncSessionGroupsCount: 20,
    // the delay between client connection and the initial sync
    initialSyncDelay: 10000,
    // if there is time sync in progress a new sync is not performed
    // this sets how many time syncs might be skipped if previous one is still in progress
    // i.e. if a message exchange between client and server takes 4s, and you have 10 as sample count
    // the time sync might take 40seconds, if you have a sync interval below 40 seconds you will run into skips
    // lower means faster detection of stale sync process, higher leaves more time for the synchronization  
    maxSkip: 1,
}


```
