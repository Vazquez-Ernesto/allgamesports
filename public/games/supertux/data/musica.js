
  var Module = typeof Module != 'undefined' ? Module : {};

  if (!Module['expectedDataFileDownloads']) Module['expectedDataFileDownloads'] = 0;
  Module['expectedDataFileDownloads']++;
  (() => {
    // Do not attempt to redownload the virtual filesystem data when in a pthread or a Wasm Worker context.
    var isPthread = typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD;
    var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER;
    if (isPthread || isWasmWorker) return;
    async function loadPackage(metadata) {

      var PACKAGE_PATH = '';
      if (typeof window === 'object') {
        PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/');
      } else if (typeof process === 'undefined' && typeof location !== 'undefined') {
        // web worker
        PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/');
      }
      var PACKAGE_NAME = 'musica.data';
      var REMOTE_PACKAGE_BASE = 'musica.data';
      var REMOTE_PACKAGE_NAME = Module['locateFile'] ? Module['locateFile'](REMOTE_PACKAGE_BASE, '') : REMOTE_PACKAGE_BASE;
      var REMOTE_PACKAGE_SIZE = metadata['remote_package_size'];

      async function fetchRemotePackage(packageName, packageSize) {
        
        if (!Module['dataFileDownloads']) Module['dataFileDownloads'] = {};
        try {
          var response = await fetch(packageName);
        } catch (e) {
          throw new Error(`Network Error: ${packageName}`, {e});
        }
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.url}`);
        }

        const chunks = [];
        const headers = response.headers;
        const total = Number(headers.get('Content-Length') || packageSize);
        let loaded = 0;

        Module['setStatus'] && Module['setStatus']('Downloading data...');
        const reader = response.body.getReader();

        while (1) {
          var {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          Module['dataFileDownloads'][packageName] = {loaded, total};

          let totalLoaded = 0;
          let totalSize = 0;

          for (const download of Object.values(Module['dataFileDownloads'])) {
            totalLoaded += download.loaded;
            totalSize += download.total;
          }

          Module['setStatus'] && Module['setStatus'](`Downloading data... (${totalLoaded}/${totalSize})`);
        }

        const packageData = new Uint8Array(chunks.map((c) => c.length).reduce((a, b) => a + b, 0));
        let offset = 0;
        for (const chunk of chunks) {
          packageData.set(chunk, offset);
          offset += chunk.length;
        }
        return packageData.buffer;
      }

    async function runWithFS(Module) {

      function assert(check, msg) {
        if (!check) throw new Error(msg);
      }
Module['FS_createPath']("/", "data", true, true);
Module['FS_createPath']("/data", "music", true, true);
Module['FS_createPath']("/data/music", "antarctic", true, true);
Module['FS_createPath']("/data/music", "castle", true, true);
Module['FS_createPath']("/data/music", "forest", true, true);
Module['FS_createPath']("/data/music", "misc", true, true);
Module['FS_createPath']("/data/music", "retro", true, true);
Module['FS_createPath']("/data/music", "tropical", true, true);

        var PACKAGE_UUID = metadata['package_uuid'];
        var IDB_RO = "readonly";
        var IDB_RW = "readwrite";
        var DB_NAME = "EM_PRELOAD_CACHE";
        var DB_VERSION = 1;
        var METADATA_STORE_NAME = 'METADATA';
        var PACKAGE_STORE_NAME = 'PACKAGES';

        async function openDatabase() {
          if (typeof indexedDB == 'undefined') {
            throw new Error('using IndexedDB to cache data can only be done on a web page or in a web worker');
          }
          return new Promise((resolve, reject) => {
            var openRequest = indexedDB.open(DB_NAME, DB_VERSION);
            openRequest.onupgradeneeded = (event) => {
              var db = /** @type {IDBDatabase} */ (event.target.result);

              if (db.objectStoreNames.contains(PACKAGE_STORE_NAME)) {
                db.deleteObjectStore(PACKAGE_STORE_NAME);
              }
              var packages = db.createObjectStore(PACKAGE_STORE_NAME);

              if (db.objectStoreNames.contains(METADATA_STORE_NAME)) {
                db.deleteObjectStore(METADATA_STORE_NAME);
              }
              var metadata = db.createObjectStore(METADATA_STORE_NAME);
            };
            openRequest.onsuccess = (event) => {
              var db = /** @type {IDBDatabase} */ (event.target.result);
              resolve(db);
            };
            openRequest.onerror = reject;
          });
        }

        // This is needed as chromium has a limit on per-entry files in IndexedDB
        // https://cs.chromium.org/chromium/src/content/renderer/indexed_db/webidbdatabase_impl.cc?type=cs&sq=package:chromium&g=0&l=177
        // https://cs.chromium.org/chromium/src/out/Debug/gen/third_party/blink/public/mojom/indexeddb/indexeddb.mojom.h?type=cs&sq=package:chromium&g=0&l=60
        // We set the chunk size to 64MB to stay well-below the limit
        var CHUNK_SIZE = 64 * 1024 * 1024;

        async function cacheRemotePackage(db, packageName, packageData, packageMeta) {
          var transactionPackages = db.transaction([PACKAGE_STORE_NAME], IDB_RW);
          var packages = transactionPackages.objectStore(PACKAGE_STORE_NAME);
          var chunkSliceStart = 0;
          var nextChunkSliceStart = 0;
          var chunkCount = Math.ceil(packageData.byteLength / CHUNK_SIZE);
          var finishedChunks = 0;

          return new Promise((resolve, reject) => {
            for (var chunkId = 0; chunkId < chunkCount; chunkId++) {
              nextChunkSliceStart += CHUNK_SIZE;
              var putPackageRequest = packages.put(
                packageData.slice(chunkSliceStart, nextChunkSliceStart),
                `package/${packageName}/${chunkId}`
              );
              chunkSliceStart = nextChunkSliceStart;
              putPackageRequest.onsuccess = (event) => {
                finishedChunks++;
                if (finishedChunks == chunkCount) {
                  var transaction_metadata = db.transaction(
                    [METADATA_STORE_NAME],
                    IDB_RW
                  );
                  var metadata = transaction_metadata.objectStore(METADATA_STORE_NAME);
                  var putMetadataRequest = metadata.put(
                    {
                      'uuid': packageMeta.uuid,
                      'chunkCount': chunkCount
                    },
                    `metadata/${packageName}`
                  );
                  putMetadataRequest.onsuccess = (event) => resolve(packageData);
                  putMetadataRequest.onerror = reject;
                }
              };
              putPackageRequest.onerror = reject;
            }
          });
        }

        /*
         * Check if there's a cached package, and if so whether it's the latest available.
         * Resolves to the cached metadata, or `null` if it is missing or out-of-date.
         */
        async function checkCachedPackage(db, packageName) {
          var transaction = db.transaction([METADATA_STORE_NAME], IDB_RO);
          var metadata = transaction.objectStore(METADATA_STORE_NAME);
          var getRequest = metadata.get(`metadata/${packageName}`);
          return new Promise((resolve, reject) => {
            getRequest.onsuccess = (event) => {
              var result = event.target.result;
              if (result && PACKAGE_UUID === result['uuid']) {
                resolve(result);
              } else {
                resolve(null);
              }
            }
            getRequest.onerror = reject;
          });
        }

        async function fetchCachedPackage(db, packageName, metadata) {
          var transaction = db.transaction([PACKAGE_STORE_NAME], IDB_RO);
          var packages = transaction.objectStore(PACKAGE_STORE_NAME);

          var chunksDone = 0;
          var totalSize = 0;
          var chunkCount = metadata['chunkCount'];
          var chunks = new Array(chunkCount);

          return new Promise((resolve, reject) => {
            for (var chunkId = 0; chunkId < chunkCount; chunkId++) {
              var getRequest = packages.get(`package/${packageName}/${chunkId}`);
              getRequest.onsuccess = (event) => {
                if (!event.target.result) {
                  reject(`CachedPackageNotFound for: ${packageName}`);
                  return;
                }
                // If there's only 1 chunk, there's nothing to concatenate it with so we can just return it now
                if (chunkCount == 1) {
                  resolve(event.target.result);
                } else {
                  chunksDone++;
                  totalSize += event.target.result.byteLength;
                  chunks.push(event.target.result);
                  if (chunksDone == chunkCount) {
                    if (chunksDone == 1) {
                      resolve(event.target.result);
                    } else {
                      var tempTyped = new Uint8Array(totalSize);
                      var byteOffset = 0;
                      for (var chunkId in chunks) {
                        var buffer = chunks[chunkId];
                        tempTyped.set(new Uint8Array(buffer), byteOffset);
                        byteOffset += buffer.byteLength;
                        buffer = undefined;
                      }
                      chunks = undefined;
                      resolve(tempTyped.buffer);
                      tempTyped = undefined;
                    }
                  }
                }
              };
              getRequest.onerror = reject;
            }
          });
        }

      async function processPackageData(arrayBuffer) {
        assert(arrayBuffer, 'Loading data file failed.');
        assert(arrayBuffer.constructor.name === ArrayBuffer.name, 'bad input to processPackageData ' + arrayBuffer.constructor.name);
        var byteArray = new Uint8Array(arrayBuffer);
        var curr;
        // Reuse the bytearray from the XHR as the source for file reads.
          for (var file of metadata['files']) {
            var name = file['filename'];
            var data = byteArray.subarray(file['start'], file['end']);
            // canOwn this data in the filesystem, it is a slice into the heap that will never change
        Module['FS_createDataFile'](name, null, data, true, true, true);
          }
          Module['removeRunDependency']('datafile_musica.data');
      }
      Module['addRunDependency']('datafile_musica.data');

      if (!Module['preloadResults']) Module['preloadResults'] = {};

        async function preloadFallback(error) {
          console.error(error);
          console.error('falling back to default preload behavior');
          await processPackageData(await fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE));
        }

        try {
          var db = await openDatabase();
          var pkgMetadata = await checkCachedPackage(db, PACKAGE_PATH + PACKAGE_NAME);
          var useCached = !!pkgMetadata;
          Module['preloadResults'][PACKAGE_NAME] = {fromCache: useCached};
          if (useCached) {
            await processPackageData(await fetchCachedPackage(db, PACKAGE_PATH + PACKAGE_NAME, pkgMetadata));
          } else {
            var packageData = await fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
            try {
              await processPackageData(await cacheRemotePackage(db, PACKAGE_PATH + PACKAGE_NAME, packageData, {uuid:PACKAGE_UUID}))
            } catch (error) {
              console.error(error);
              await processPackageData(packageData);
            }
          }
        } catch(e) {
          await preloadFallback(e);
        }

        Module['setStatus'] && Module['setStatus']('Downloading...');

    }
    // Detect whether the module JS file has already been loaded.
    if (Module['FS_createPath']) {
      runWithFS(Module);
    } else {
      if (!Module['preRun']) Module['preRun'] = [];
      Module['preRun'].push(runWithFS); // FS is not initialized yet, wait for it
    }

    }
    loadPackage({"files": [{"filename": "/data/music/antarctic/airship_2.ogg", "start": 0, "end": 1583237}, {"filename": "/data/music/antarctic/airship_remix-2.music", "start": 1583237, "end": 1583400}, {"filename": "/data/music/antarctic/airship_remix.music", "start": 1583400, "end": 1583595}, {"filename": "/data/music/antarctic/airship_remix.ogg", "start": 1583595, "end": 2377565}, {"filename": "/data/music/antarctic/arctic_breeze.music", "start": 2377565, "end": 2377745}, {"filename": "/data/music/antarctic/arctic_breeze.ogg", "start": 2377745, "end": 4027467}, {"filename": "/data/music/antarctic/arctic_cave.music", "start": 4027467, "end": 4027639}, {"filename": "/data/music/antarctic/arctic_cave.ogg", "start": 4027639, "end": 6147840}, {"filename": "/data/music/antarctic/bossattack.music", "start": 6147840, "end": 6148016}, {"filename": "/data/music/antarctic/bossattack.ogg", "start": 6148016, "end": 6720488}, {"filename": "/data/music/antarctic/cave.music", "start": 6720488, "end": 6720675}, {"filename": "/data/music/antarctic/cave.ogg", "start": 6720675, "end": 7330420}, {"filename": "/data/music/antarctic/cavetheme.music", "start": 7330420, "end": 7330574}, {"filename": "/data/music/antarctic/cavetheme.ogg", "start": 7330574, "end": 7884513}, {"filename": "/data/music/antarctic/cavetheme_alt.music", "start": 7884513, "end": 7884671}, {"filename": "/data/music/antarctic/cavetheme_alt.ogg", "start": 7884671, "end": 8598399}, {"filename": "/data/music/antarctic/chipdisko.music", "start": 8598399, "end": 8598589}, {"filename": "/data/music/antarctic/chipdisko.ogg", "start": 8598589, "end": 9691688}, {"filename": "/data/music/antarctic/crystalmine_intro.music", "start": 9691688, "end": 9691823}, {"filename": "/data/music/antarctic/crystalmine_intro.ogg", "start": 9691823, "end": 10001269}, {"filename": "/data/music/antarctic/crystalmine_main.music", "start": 10001269, "end": 10001412}, {"filename": "/data/music/antarctic/crystalmine_main.ogg", "start": 10001412, "end": 11152207}, {"filename": "/data/music/antarctic/glacier.music", "start": 11152207, "end": 11152341}, {"filename": "/data/music/antarctic/glacier.ogg", "start": 11152341, "end": 11832568}, {"filename": "/data/music/antarctic/jewels.music", "start": 11832568, "end": 11832807}, {"filename": "/data/music/antarctic/jewels.ogg", "start": 11832807, "end": 12310380}, {"filename": "/data/music/antarctic/late_sunset.music", "start": 12310380, "end": 12310473}, {"filename": "/data/music/antarctic/late_sunset.ogg", "start": 12310473, "end": 12979435}, {"filename": "/data/music/antarctic/midday.music", "start": 12979435, "end": 12979559}, {"filename": "/data/music/antarctic/midday.ogg", "start": 12979559, "end": 13479210}, {"filename": "/data/music/antarctic/midday_alt.music", "start": 13479210, "end": 13479338}, {"filename": "/data/music/antarctic/midday_alt.ogg", "start": 13479338, "end": 13932481}, {"filename": "/data/music/antarctic/night.music", "start": 13932481, "end": 13932612}, {"filename": "/data/music/antarctic/night.ogg", "start": 13932612, "end": 14429586}, {"filename": "/data/music/antarctic/salcon.music", "start": 14429586, "end": 14429790}, {"filename": "/data/music/antarctic/salcon.ogg", "start": 14429790, "end": 14848848}, {"filename": "/data/music/antarctic/skylevel.music", "start": 14848848, "end": 14848983}, {"filename": "/data/music/antarctic/skylevel.ogg", "start": 14848983, "end": 15494243}, {"filename": "/data/music/antarctic/snowfort.music", "start": 15494243, "end": 15494377}, {"filename": "/data/music/antarctic/snowfort.ogg", "start": 15494377, "end": 16220357}, {"filename": "/data/music/antarctic/sunset.music", "start": 16220357, "end": 16220491}, {"filename": "/data/music/antarctic/sunset.ogg", "start": 16220491, "end": 17036878}, {"filename": "/data/music/antarctic/underwater.music", "start": 17036878, "end": 17037016}, {"filename": "/data/music/antarctic/underwater.ogg", "start": 17037016, "end": 17914293}, {"filename": "/data/music/antarctic/voc-boss.music", "start": 17914293, "end": 17914441}, {"filename": "/data/music/antarctic/voc-boss.ogg", "start": 17914441, "end": 17953421}, {"filename": "/data/music/antarctic/voc-dark.music", "start": 17953421, "end": 17953569}, {"filename": "/data/music/antarctic/voc-dark.ogg", "start": 17953569, "end": 18101592}, {"filename": "/data/music/antarctic/voc-daytime.music", "start": 18101592, "end": 18101743}, {"filename": "/data/music/antarctic/voc-daytime.ogg", "start": 18101743, "end": 18724803}, {"filename": "/data/music/antarctic/voc-night.music", "start": 18724803, "end": 18724967}, {"filename": "/data/music/antarctic/voc-night.ogg", "start": 18724967, "end": 19091124}, {"filename": "/data/music/antarctic/voc_night_alt.music", "start": 19091124, "end": 19091220}, {"filename": "/data/music/antarctic/voc_night_alt.ogg", "start": 19091220, "end": 19977882}, {"filename": "/data/music/antarctic/worldmap_ice.music", "start": 19977882, "end": 19978012}, {"filename": "/data/music/antarctic/worldmap_ice.ogg", "start": 19978012, "end": 20266113}, {"filename": "/data/music/antarctic/yetiboss.music", "start": 20266113, "end": 20266274}, {"filename": "/data/music/antarctic/yetiboss.ogg", "start": 20266274, "end": 20901389}, {"filename": "/data/music/castle/darkforestkeep.music", "start": 20901389, "end": 20901573}, {"filename": "/data/music/castle/darkforestkeep.ogg", "start": 20901573, "end": 22170210}, {"filename": "/data/music/castle/fortress.music", "start": 22170210, "end": 22170406}, {"filename": "/data/music/castle/fortress.ogg", "start": 22170406, "end": 22602072}, {"filename": "/data/music/castle/icecastle.music", "start": 22602072, "end": 22602234}, {"filename": "/data/music/castle/icecastle.ogg", "start": 22602234, "end": 23237965}, {"filename": "/data/music/forest/beneath_the_rabbit_hole.music", "start": 23237965, "end": 23238157}, {"filename": "/data/music/forest/beneath_the_rabbit_hole.ogg", "start": 23238157, "end": 24719740}, {"filename": "/data/music/forest/bright_thunders.music", "start": 24719740, "end": 24719887}, {"filename": "/data/music/forest/bright_thunders.ogg", "start": 24719887, "end": 25686919}, {"filename": "/data/music/forest/call_of_the_winding_path.music", "start": 25686919, "end": 25687075}, {"filename": "/data/music/forest/call_of_the_winding_path.ogg", "start": 25687075, "end": 28581046}, {"filename": "/data/music/forest/clavelian_march.music", "start": 28581046, "end": 28581184}, {"filename": "/data/music/forest/clavelian_march.ogg", "start": 28581184, "end": 29475860}, {"filename": "/data/music/forest/counter_current.music", "start": 29475860, "end": 29475952}, {"filename": "/data/music/forest/counter_current.ogg", "start": 29475952, "end": 31146239}, {"filename": "/data/music/forest/deeply_rooted.music", "start": 31146239, "end": 31146324}, {"filename": "/data/music/forest/deeply_rooted.ogg", "start": 31146324, "end": 31696015}, {"filename": "/data/music/forest/forest-cave.music", "start": 31696015, "end": 31696163}, {"filename": "/data/music/forest/forest-cave.ogg", "start": 31696163, "end": 32882191}, {"filename": "/data/music/forest/forest-sprint.music", "start": 32882191, "end": 32882341}, {"filename": "/data/music/forest/forest-sprint.ogg", "start": 32882341, "end": 34468660}, {"filename": "/data/music/forest/forest.music", "start": 34468660, "end": 34468848}, {"filename": "/data/music/forest/forest.ogg", "start": 34468848, "end": 35472351}, {"filename": "/data/music/forest/forest2.music", "start": 35472351, "end": 35472532}, {"filename": "/data/music/forest/forest2.ogg", "start": 35472532, "end": 36577253}, {"filename": "/data/music/forest/forest3.music", "start": 36577253, "end": 36577436}, {"filename": "/data/music/forest/forest3.ogg", "start": 36577436, "end": 37295491}, {"filename": "/data/music/forest/forest_midday.music", "start": 37295491, "end": 37295666}, {"filename": "/data/music/forest/forest_midday.ogg", "start": 37295666, "end": 38145660}, {"filename": "/data/music/forest/forest_midday_alt.music", "start": 38145660, "end": 38145839}, {"filename": "/data/music/forest/forest_midday_alt.ogg", "start": 38145839, "end": 38963014}, {"filename": "/data/music/forest/forest_theme.music", "start": 38963014, "end": 38963232}, {"filename": "/data/music/forest/forest_theme.ogg", "start": 38963232, "end": 39830700}, {"filename": "/data/music/forest/ghostforest.music", "start": 39830700, "end": 39830876}, {"filename": "/data/music/forest/ghostforest.ogg", "start": 39830876, "end": 40484102}, {"filename": "/data/music/forest/ghostforest2.music", "start": 40484102, "end": 40484289}, {"filename": "/data/music/forest/ghostforest2.ogg", "start": 40484289, "end": 41041310}, {"filename": "/data/music/forest/ghostforest_map.music", "start": 41041310, "end": 41041462}, {"filename": "/data/music/forest/ghostforest_map.ogg", "start": 41041462, "end": 42952733}, {"filename": "/data/music/forest/greatgigantic.music", "start": 42952733, "end": 42952972}, {"filename": "/data/music/forest/greatgigantic.ogg", "start": 42952972, "end": 43681702}, {"filename": "/data/music/forest/march_of_the_malevolent.music", "start": 43681702, "end": 43681919}, {"filename": "/data/music/forest/march_of_the_malevolent.ogg", "start": 43681919, "end": 44467724}, {"filename": "/data/music/forest/new_forest_map.music", "start": 44467724, "end": 44467877}, {"filename": "/data/music/forest/new_forest_map.ogg", "start": 44467877, "end": 45310168}, {"filename": "/data/music/forest/shallow-green.music", "start": 45310168, "end": 45310347}, {"filename": "/data/music/forest/shallow-green.ogg", "start": 45310347, "end": 47257148}, {"filename": "/data/music/forest/treeboss.music", "start": 47257148, "end": 47257300}, {"filename": "/data/music/forest/treeboss.ogg", "start": 47257300, "end": 47938544}, {"filename": "/data/music/forest/wisphunt.music", "start": 47938544, "end": 47938696}, {"filename": "/data/music/forest/wisphunt.ogg", "start": 47938696, "end": 48409541}, {"filename": "/data/music/misc/battle_theme.music", "start": 48409541, "end": 48409707}, {"filename": "/data/music/misc/battle_theme.ogg", "start": 48409707, "end": 49826530}, {"filename": "/data/music/misc/bonuscave.music", "start": 49826530, "end": 49826702}, {"filename": "/data/music/misc/bonuscave.ogg", "start": 49826702, "end": 49894830}, {"filename": "/data/music/misc/calm_ocean.music", "start": 49894830, "end": 49894913}, {"filename": "/data/music/misc/calm_ocean.ogg", "start": 49894913, "end": 50863508}, {"filename": "/data/music/misc/christmas_theme.music", "start": 50863508, "end": 50863592}, {"filename": "/data/music/misc/christmas_theme.ogg", "start": 50863592, "end": 51818181}, {"filename": "/data/music/misc/credits.music", "start": 51818181, "end": 51818364}, {"filename": "/data/music/misc/credits.ogg", "start": 51818364, "end": 52547601}, {"filename": "/data/music/misc/halloween_1.music", "start": 52547601, "end": 52547740}, {"filename": "/data/music/misc/halloween_1.ogg", "start": 52547740, "end": 53434371}, {"filename": "/data/music/misc/intro.music", "start": 53434371, "end": 53434548}, {"filename": "/data/music/misc/intro.ogg", "start": 53434548, "end": 53696706}, {"filename": "/data/music/misc/invincible.music", "start": 53696706, "end": 53696817}, {"filename": "/data/music/misc/invincible.ogg", "start": 53696817, "end": 53790246}, {"filename": "/data/music/misc/leveldone.ogg", "start": 53790246, "end": 53835708}, {"filename": "/data/music/misc/theme.music", "start": 53835708, "end": 53835903}, {"filename": "/data/music/misc/theme.ogg", "start": 53835903, "end": 54720598}, {"filename": "/data/music/retro/cave_old.music", "start": 54720598, "end": 54720787}, {"filename": "/data/music/retro/cave_old.ogg", "start": 54720787, "end": 55150858}, {"filename": "/data/music/retro/classic.music", "start": 55150858, "end": 55150973}, {"filename": "/data/music/retro/classic.ogg", "start": 55150973, "end": 55706208}, {"filename": "/data/music/retro/fortress_old.music", "start": 55706208, "end": 55706401}, {"filename": "/data/music/retro/fortress_old.ogg", "start": 55706401, "end": 56001619}, {"filename": "/data/music/retro/ice_music.music", "start": 56001619, "end": 56001758}, {"filename": "/data/music/retro/ice_music.ogg", "start": 56001758, "end": 56989605}, {"filename": "/data/music/retro/theme_old.music", "start": 56989605, "end": 56989693}, {"filename": "/data/music/retro/theme_old.ogg", "start": 56989693, "end": 57401057}, {"filename": "/data/music/retro/worldmap_old.music", "start": 57401057, "end": 57401194}, {"filename": "/data/music/retro/worldmap_old.ogg", "start": 57401194, "end": 57714111}, {"filename": "/data/music/tropical/saharan_penguin.music", "start": 57714111, "end": 57714252}, {"filename": "/data/music/tropical/saharan_penguin.ogg", "start": 57714252, "end": 58409038}, {"filename": "/data/music/tropical/tropicalbreeze.music", "start": 58409038, "end": 58409203}, {"filename": "/data/music/tropical/tropicalbreeze.ogg", "start": 58409203, "end": 58955995}], "remote_package_size": 58955995, "package_uuid": "sha256-f64f88818343ee553598d3f57258395fe2bc0a3438302019e547ccf9903e332e"});

  })();
