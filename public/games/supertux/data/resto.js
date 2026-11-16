
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
      var PACKAGE_NAME = '/mnt/c/Users/CFOTech/Downloads/Personal/REA/allgamesports/engines/supertux/../../public/games/supertux/data/resto.data';
      var REMOTE_PACKAGE_BASE = 'resto.data';
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
Module['FS_createPath']("/data", "fonts", true, true);
Module['FS_createPath']("/data", "levels", true, true);
Module['FS_createPath']("/data/levels", "bonus1", true, true);
Module['FS_createPath']("/data/levels", "misc", true, true);
Module['FS_createPath']("/data/levels", "revenge_in_redmond", true, true);
Module['FS_createPath']("/data/levels", "world1", true, true);
Module['FS_createPath']("/data/levels", "world2", true, true);
Module['FS_createPath']("/data/levels", "world3", true, true);
Module['FS_createPath']("/data/levels", "world4", true, true);
Module['FS_createPath']("/data", "locale", true, true);
Module['FS_createPath']("/data", "particles", true, true);
Module['FS_createPath']("/data/particles", "custom", true, true);
Module['FS_createPath']("/data/particles", "generic", true, true);
Module['FS_createPath']("/data", "scripts", true, true);
Module['FS_createPath']("/data", "shader", true, true);
Module['FS_createPath']("/data", "sounds", true, true);
Module['FS_createPath']("/data", "speech", true, true);

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
          Module['removeRunDependency']('datafile_/mnt/c/Users/CFOTech/Downloads/Personal/REA/allgamesports/engines/supertux/../../public/games/supertux/data/resto.data');
      }
      Module['addRunDependency']('datafile_/mnt/c/Users/CFOTech/Downloads/Personal/REA/allgamesports/engines/supertux/../../public/games/supertux/data/resto.data');

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
    loadPackage({"files": [{"filename": "/data/ACKNOWLEDGEMENTS.txt", "start": 0, "end": 10407}, {"filename": "/data/AUTHORS", "start": 10407, "end": 21159}, {"filename": "/data/credits.stxt", "start": 21159, "end": 45870}, {"filename": "/data/fonts/DEKKO_LICENSE.txt", "start": 45870, "end": 50171}, {"filename": "/data/fonts/Dekko-Regular.ttf", "start": 50171, "end": 257399}, {"filename": "/data/fonts/Deva-voy-white-big.stf", "start": 257399, "end": 257640}, {"filename": "/data/fonts/Deva-voy-white.stf", "start": 257640, "end": 257881}, {"filename": "/data/fonts/Deva-white-big.stf", "start": 257881, "end": 258475}, {"filename": "/data/fonts/Deva-white.stf", "start": 258475, "end": 259069}, {"filename": "/data/fonts/MapoBackpacking_License.txt", "start": 259069, "end": 268105}, {"filename": "/data/fonts/NOTO_SANS_LICENSE.txt", "start": 268105, "end": 272406}, {"filename": "/data/fonts/NotoSans-Regular.ttf", "start": 272406, "end": 828622}, {"filename": "/data/fonts/NotoSansArmenian-Regular.ttf", "start": 828622, "end": 878598}, {"filename": "/data/fonts/NotoSansKhmer-Regular.ttf", "start": 878598, "end": 980042}, {"filename": "/data/fonts/NotoSansMalayalam-Regular.ttf", "start": 980042, "end": 1086854}, {"filename": "/data/fonts/README", "start": 1086854, "end": 1087995}, {"filename": "/data/fonts/Roboto-Regular.ttf", "start": 1087995, "end": 1233343}, {"filename": "/data/fonts/Roboto_License.txt", "start": 1233343, "end": 1237737}, {"filename": "/data/fonts/SOURCECODEPRO_LICENSE.md", "start": 1237737, "end": 1242210}, {"filename": "/data/fonts/SourceCodePro-Medium.ttf", "start": 1242210, "end": 1362450}, {"filename": "/data/fonts/SuperTux-Medium.ttf", "start": 1362450, "end": 1554490}, {"filename": "/data/fonts/VARELA_ROUND_LICENSE.txt", "start": 1554490, "end": 1558791}, {"filename": "/data/fonts/VarelaRound-Regular.ttf", "start": 1558791, "end": 1684623}, {"filename": "/data/fonts/andale10.stf", "start": 1684623, "end": 1685526}, {"filename": "/data/fonts/andale12.stf", "start": 1685526, "end": 1686429}, {"filename": "/data/fonts/ara-white-big.stf", "start": 1686429, "end": 1686706}, {"filename": "/data/fonts/ara-white-small.stf", "start": 1686706, "end": 1686991}, {"filename": "/data/fonts/ara-white.stf", "start": 1686991, "end": 1687262}, {"filename": "/data/fonts/console2.stf", "start": 1687262, "end": 1688174}, {"filename": "/data/fonts/cyr-white-big.stf", "start": 1688174, "end": 1688589}, {"filename": "/data/fonts/cyr-white-small.stf", "start": 1688589, "end": 1689006}, {"filename": "/data/fonts/cyr-white.stf", "start": 1689006, "end": 1689430}, {"filename": "/data/fonts/greek-white-big.stf", "start": 1689430, "end": 1689794}, {"filename": "/data/fonts/greek-white-small.stf", "start": 1689794, "end": 1690153}, {"filename": "/data/fonts/greek-white.stf", "start": 1690153, "end": 1690504}, {"filename": "/data/fonts/ko-white-big.stf", "start": 1690504, "end": 1691539}, {"filename": "/data/fonts/ko-white-small.stf", "start": 1691539, "end": 1692578}, {"filename": "/data/fonts/ko-white.stf", "start": 1692578, "end": 1693606}, {"filename": "/data/fonts/white-big.stf", "start": 1693606, "end": 1694618}, {"filename": "/data/fonts/white-small.stf", "start": 1694618, "end": 1695632}, {"filename": "/data/fonts/white.stf", "start": 1695632, "end": 1696636}, {"filename": "/data/fonts/zh-white-big.stf", "start": 1696636, "end": 1700360}, {"filename": "/data/fonts/zh-white-small.stf", "start": 1700360, "end": 1701118}, {"filename": "/data/fonts/zh-white.stf", "start": 1701118, "end": 1704845}, {"filename": "/data/levels/bonus1/all_that_glistens.stl", "start": 1704845, "end": 1888724}, {"filename": "/data/levels/bonus1/another_cold_day.stl", "start": 1888724, "end": 2032822}, {"filename": "/data/levels/bonus1/area_42.stl", "start": 2032822, "end": 2473428}, {"filename": "/data/levels/bonus1/bonus_dias.stl", "start": 2473428, "end": 2568132}, {"filename": "/data/levels/bonus1/castle_in_sky.stl", "start": 2568132, "end": 2692063}, {"filename": "/data/levels/bonus1/cave_of_mirrors.stl", "start": 2692063, "end": 2980255}, {"filename": "/data/levels/bonus1/crumbel_cavern.stl", "start": 2980255, "end": 3087748}, {"filename": "/data/levels/bonus1/default.nut", "start": 3087748, "end": 3088425}, {"filename": "/data/levels/bonus1/end_of_ice_age.stl", "start": 3088425, "end": 3456231}, {"filename": "/data/levels/bonus1/es.po", "start": 3456231, "end": 3462959}, {"filename": "/data/levels/bonus1/es_AR.po", "start": 3462959, "end": 3469481}, {"filename": "/data/levels/bonus1/fire_in_the_sky.stl", "start": 3469481, "end": 3520910}, {"filename": "/data/levels/bonus1/fjerd.stl", "start": 3520910, "end": 3649081}, {"filename": "/data/levels/bonus1/flanders_ice_field.stl", "start": 3649081, "end": 3831693}, {"filename": "/data/levels/bonus1/high_gravity.stl", "start": 3831693, "end": 3875011}, {"filename": "/data/levels/bonus1/ice_test.stl", "start": 3875011, "end": 4240672}, {"filename": "/data/levels/bonus1/info", "start": 4240672, "end": 4240900}, {"filename": "/data/levels/bonus1/let_us_snow.stl", "start": 4240900, "end": 4368830}, {"filename": "/data/levels/bonus1/lies.stl", "start": 4368830, "end": 4503808}, {"filename": "/data/levels/bonus1/luft_airship.stl", "start": 4503808, "end": 4619201}, {"filename": "/data/levels/bonus1/mario.stl", "start": 4619201, "end": 4674621}, {"filename": "/data/levels/bonus1/maze_in_sky.stl", "start": 4674621, "end": 4742209}, {"filename": "/data/levels/bonus1/messages.pot", "start": 4742209, "end": 4746468}, {"filename": "/data/levels/bonus1/mysterious_house_of_ice.stl", "start": 4746468, "end": 4889867}, {"filename": "/data/levels/bonus1/noloks_party_pit.stl", "start": 4889867, "end": 5365007}, {"filename": "/data/levels/bonus1/penguins_cant_fly.stl", "start": 5365007, "end": 6213406}, {"filename": "/data/levels/bonus1/pipe_down_over_there.stl", "start": 6213406, "end": 6338298}, {"filename": "/data/levels/bonus1/refisherator.stl", "start": 6338298, "end": 6458021}, {"filename": "/data/levels/bonus1/semi_frozen.stl", "start": 6458021, "end": 6656111}, {"filename": "/data/levels/bonus1/snow_bowling.stl", "start": 6656111, "end": 6789306}, {"filename": "/data/levels/bonus1/snowmans_land.stl", "start": 6789306, "end": 7002817}, {"filename": "/data/levels/bonus1/snowy_sunset.stl", "start": 7002817, "end": 7159546}, {"filename": "/data/levels/bonus1/tip_of_iceberg.stl", "start": 7159546, "end": 7375391}, {"filename": "/data/levels/bonus1/train_leaves_in_one_minute.nut", "start": 7375391, "end": 7379853}, {"filename": "/data/levels/bonus1/train_leaves_in_one_minute.stl", "start": 7379853, "end": 7439528}, {"filename": "/data/levels/bonus1/tux_parties_like_a.nut", "start": 7439528, "end": 7444753}, {"filename": "/data/levels/bonus1/where_everything_possible.stl", "start": 7444753, "end": 7471488}, {"filename": "/data/levels/bonus1/worldmap.stwm", "start": 7471488, "end": 7517377}, {"filename": "/data/levels/misc/credits.stl", "start": 7517377, "end": 7523108}, {"filename": "/data/levels/misc/info", "start": 7523108, "end": 7523237}, {"filename": "/data/levels/misc/menu.stl", "start": 7523237, "end": 7599688}, {"filename": "/data/levels/misc/menu_retro.stl", "start": 7599688, "end": 7608496}, {"filename": "/data/levels/misc/messages.pot", "start": 7608496, "end": 7609466}, {"filename": "/data/levels/preload_worldselect.nut", "start": 7609466, "end": 7609928}, {"filename": "/data/levels/revenge_in_redmond/antarctica.stl", "start": 7609928, "end": 7627010}, {"filename": "/data/levels/revenge_in_redmond/es.po", "start": 7627010, "end": 7632750}, {"filename": "/data/levels/revenge_in_redmond/es_AR.po", "start": 7632750, "end": 7638481}, {"filename": "/data/levels/revenge_in_redmond/get_to_choppa.stl", "start": 7638481, "end": 7679865}, {"filename": "/data/levels/revenge_in_redmond/info", "start": 7679865, "end": 7680144}, {"filename": "/data/levels/revenge_in_redmond/intro.stl", "start": 7680144, "end": 7683028}, {"filename": "/data/levels/revenge_in_redmond/intro.txt", "start": 7683028, "end": 7683727}, {"filename": "/data/levels/revenge_in_redmond/long_office_nights.stl", "start": 7683727, "end": 7709113}, {"filename": "/data/levels/revenge_in_redmond/messages.pot", "start": 7709113, "end": 7712564}, {"filename": "/data/levels/revenge_in_redmond/outro.stl", "start": 7712564, "end": 7716777}, {"filename": "/data/levels/revenge_in_redmond/outro.txt", "start": 7716777, "end": 7717707}, {"filename": "/data/levels/revenge_in_redmond/redmond_headquarters.stl", "start": 7717707, "end": 7758547}, {"filename": "/data/levels/revenge_in_redmond/where_my_super_cape.stl", "start": 7758547, "end": 7790084}, {"filename": "/data/levels/revenge_in_redmond/who_is_gown.stl", "start": 7790084, "end": 7816294}, {"filename": "/data/levels/revenge_in_redmond/worldmap.stwm", "start": 7816294, "end": 7819779}, {"filename": "/data/levels/world1/23rd_airborne.stl", "start": 7819779, "end": 7900593}, {"filename": "/data/levels/world1/above_arctic_skies.stl", "start": 7900593, "end": 7967171}, {"filename": "/data/levels/world1/antarctic_outpost.stl", "start": 7967171, "end": 8074628}, {"filename": "/data/levels/world1/between_glaciers.stl", "start": 8074628, "end": 8281302}, {"filename": "/data/levels/world1/bouncy_mountainside.stl", "start": 8281302, "end": 8351480}, {"filename": "/data/levels/world1/castle_cutscene.nut", "start": 8351480, "end": 8360197}, {"filename": "/data/levels/world1/castle_cutscene.stl", "start": 8360197, "end": 8397041}, {"filename": "/data/levels/world1/castle_of_nolok.stl", "start": 8397041, "end": 8562361}, {"filename": "/data/levels/world1/crystal_mine.nut", "start": 8562361, "end": 8567402}, {"filename": "/data/levels/world1/crystal_mine.stl", "start": 8567402, "end": 9131942}, {"filename": "/data/levels/world1/deep_dive_chill.stl", "start": 9131942, "end": 9462173}, {"filename": "/data/levels/world1/default.nut", "start": 9462173, "end": 9463935}, {"filename": "/data/levels/world1/end_of_tunnel.stl", "start": 9463935, "end": 9607934}, {"filename": "/data/levels/world1/entrance_cave.stl", "start": 9607934, "end": 9713352}, {"filename": "/data/levels/world1/es.po", "start": 9713352, "end": 9732963}, {"filename": "/data/levels/world1/es_AR.po", "start": 9732963, "end": 9751799}, {"filename": "/data/levels/world1/fork_in_the_road.stl", "start": 9751799, "end": 9823205}, {"filename": "/data/levels/world1/frosted_fields.stl", "start": 9823205, "end": 9871974}, {"filename": "/data/levels/world1/ice_in_the_hole.stl", "start": 9871974, "end": 10017281}, {"filename": "/data/levels/world1/info", "start": 10017281, "end": 10017473}, {"filename": "/data/levels/world1/into_stars.stl", "start": 10017473, "end": 10068375}, {"filename": "/data/levels/world1/intro.nut", "start": 10068375, "end": 10075077}, {"filename": "/data/levels/world1/intro.stl", "start": 10075077, "end": 10084796}, {"filename": "/data/levels/world1/journey_begins.stl", "start": 10084796, "end": 10116233}, {"filename": "/data/levels/world1/living_inside_fridge.stl", "start": 10116233, "end": 10243859}, {"filename": "/data/levels/world1/messages.pot", "start": 10243859, "end": 10256305}, {"filename": "/data/levels/world1/more_snowballs.stl", "start": 10256305, "end": 10347161}, {"filename": "/data/levels/world1/night_chill.stl", "start": 10347161, "end": 10436794}, {"filename": "/data/levels/world1/or_just_me.stl", "start": 10436794, "end": 10594194}, {"filename": "/data/levels/world1/path_in_clouds.stl", "start": 10594194, "end": 10677013}, {"filename": "/data/levels/world1/shattered_bridge.stl", "start": 10677013, "end": 10786099}, {"filename": "/data/levels/world1/slippery_slide.stl", "start": 10786099, "end": 11079521}, {"filename": "/data/levels/world1/somewhat_smaller_bath.stl", "start": 11079521, "end": 11162860}, {"filename": "/data/levels/world1/stone_cold.stl", "start": 11162860, "end": 11225017}, {"filename": "/data/levels/world1/under_the_ice.stl", "start": 11225017, "end": 11321122}, {"filename": "/data/levels/world1/welcome_antarctica.stl", "start": 11321122, "end": 11347374}, {"filename": "/data/levels/world1/worldmap.nut", "start": 11347374, "end": 11350671}, {"filename": "/data/levels/world1/worldmap.stwm", "start": 11350671, "end": 11389662}, {"filename": "/data/levels/world1/yeti_boss.stl", "start": 11389662, "end": 11398142}, {"filename": "/data/levels/world1/yeti_cutscene.nut", "start": 11398142, "end": 11401654}, {"filename": "/data/levels/world1/yeti_cutscene.stl", "start": 11401654, "end": 11414403}, {"filename": "/data/levels/world1/yetiwin_cutscene.nut", "start": 11414403, "end": 11418915}, {"filename": "/data/levels/world1/yetiwin_cutscene.stl", "start": 11418915, "end": 11445121}, {"filename": "/data/levels/world2/ancient_ruin.stl", "start": 11445121, "end": 11961187}, {"filename": "/data/levels/world2/bouncy_coils.stl", "start": 11961187, "end": 12137407}, {"filename": "/data/levels/world2/cave_patrol.stl", "start": 12137407, "end": 12365933}, {"filename": "/data/levels/world2/collapse_imminent.stl", "start": 12365933, "end": 12681001}, {"filename": "/data/levels/world2/corrupted_cutscene.nut", "start": 12681001, "end": 12689979}, {"filename": "/data/levels/world2/corrupted_cutscene.stl", "start": 12689979, "end": 12749236}, {"filename": "/data/levels/world2/crumbling_path.stl", "start": 12749236, "end": 12974674}, {"filename": "/data/levels/world2/default.nut", "start": 12974674, "end": 12976436}, {"filename": "/data/levels/world2/drop_ball.stl", "start": 12976436, "end": 13364564}, {"filename": "/data/levels/world2/entangled_roots.stl", "start": 13364564, "end": 13491502}, {"filename": "/data/levels/world2/es.po", "start": 13491502, "end": 13512703}, {"filename": "/data/levels/world2/es_AR.po", "start": 13512703, "end": 13520050}, {"filename": "/data/levels/world2/find_bigger_fish.stl", "start": 13520050, "end": 13710559}, {"filename": "/data/levels/world2/flooded_chambers.stl", "start": 13710559, "end": 14160020}, {"filename": "/data/levels/world2/floral_blossom.nut", "start": 14160020, "end": 14168577}, {"filename": "/data/levels/world2/floral_blossom.stl", "start": 14168577, "end": 14679637}, {"filename": "/data/levels/world2/forest_intro.nut", "start": 14679637, "end": 14682372}, {"filename": "/data/levels/world2/forest_intro.stl", "start": 14682372, "end": 14700094}, {"filename": "/data/levels/world2/ghosttree_boss.stl", "start": 14700094, "end": 14708583}, {"filename": "/data/levels/world2/ghosttree_cutscene.nut", "start": 14708583, "end": 14715020}, {"filename": "/data/levels/world2/ghosttree_cutscene.stl", "start": 14715020, "end": 14942341}, {"filename": "/data/levels/world2/ghosttreewin_cutscene.nut", "start": 14942341, "end": 14947169}, {"filename": "/data/levels/world2/ghosttreewin_cutscene.stl", "start": 14947169, "end": 15021576}, {"filename": "/data/levels/world2/going_underground.stl", "start": 15021576, "end": 15172951}, {"filename": "/data/levels/world2/granito_village.stl", "start": 15172951, "end": 15537097}, {"filename": "/data/levels/world2/hollow_earth.stl", "start": 15537097, "end": 15915571}, {"filename": "/data/levels/world2/home_dead_home.stl", "start": 15915571, "end": 16178448}, {"filename": "/data/levels/world2/info", "start": 16178448, "end": 16178672}, {"filename": "/data/levels/world2/lost_sanctuary.stl", "start": 16178672, "end": 16628364}, {"filename": "/data/levels/world2/messages.pot", "start": 16628364, "end": 16642012}, {"filename": "/data/levels/world2/mouldy_grotto.stl", "start": 16642012, "end": 16801445}, {"filename": "/data/levels/world2/mount_crushmore.stl", "start": 16801445, "end": 16932820}, {"filename": "/data/levels/world2/owls_skydive_commando.stl", "start": 16932820, "end": 17192477}, {"filename": "/data/levels/world2/penguin_on_tree.stl", "start": 17192477, "end": 17308846}, {"filename": "/data/levels/world2/rock_roll.stl", "start": 17308846, "end": 17433029}, {"filename": "/data/levels/world2/root_for_you.stl", "start": 17433029, "end": 17712084}, {"filename": "/data/levels/world2/rooted_tower.stl", "start": 17712084, "end": 18025465}, {"filename": "/data/levels/world2/shallow_green.stl", "start": 18025465, "end": 18079557}, {"filename": "/data/levels/world2/shocking.stl", "start": 18079557, "end": 18217375}, {"filename": "/data/levels/world2/square_root_agony.stl", "start": 18217375, "end": 18447822}, {"filename": "/data/levels/world2/sticks_stones.stl", "start": 18447822, "end": 18750463}, {"filename": "/data/levels/world2/striking_wood.stl", "start": 18750463, "end": 19168966}, {"filename": "/data/levels/world2/three_sheets_wind.stl", "start": 19168966, "end": 19411694}, {"filename": "/data/levels/world2/through_dark.stl", "start": 19411694, "end": 19671938}, {"filename": "/data/levels/world2/tux_builder.stl", "start": 19671938, "end": 19803330}, {"filename": "/data/levels/world2/welcome_forest.stl", "start": 19803330, "end": 19887963}, {"filename": "/data/levels/world2/wooden_roots.stl", "start": 19887963, "end": 20028419}, {"filename": "/data/levels/world2/worldmap.nut", "start": 20028419, "end": 20033936}, {"filename": "/data/levels/world2/worldmap.stwm", "start": 20033936, "end": 20137524}, {"filename": "/data/levels/world2/worse_salmonella.stl", "start": 20137524, "end": 20399510}, {"filename": "/data/levels/world3/info", "start": 20399510, "end": 20399651}, {"filename": "/data/levels/world3/messages.pot", "start": 20399651, "end": 20400400}, {"filename": "/data/levels/world3/worldmap.stwm", "start": 20400400, "end": 20400726}, {"filename": "/data/levels/world4/info", "start": 20400726, "end": 20400864}, {"filename": "/data/levels/world4/messages.pot", "start": 20400864, "end": 20401609}, {"filename": "/data/levels/world4/worldmap.stwm", "start": 20401609, "end": 20401923}, {"filename": "/data/locale/es.po", "start": 20401923, "end": 20564647}, {"filename": "/data/locale/es_AR.po", "start": 20564647, "end": 20720952}, {"filename": "/data/locale/messages.pot", "start": 20720952, "end": 20848937}, {"filename": "/data/particles/custom/default.stcp", "start": 20848937, "end": 20849193}, {"filename": "/data/particles/default.stcp", "start": 20849193, "end": 20849449}, {"filename": "/data/particles/generic/bubble.png", "start": 20849449, "end": 20849904}, {"filename": "/data/particles/generic/bubbles.stcp", "start": 20849904, "end": 20850752}, {"filename": "/data/particles/generic/bug_but_it_looks_bad.png", "start": 20850752, "end": 20851819}, {"filename": "/data/particles/generic/leaf.png", "start": 20851819, "end": 20852731}, {"filename": "/data/particles/generic/leaves.stcp", "start": 20852731, "end": 20853620}, {"filename": "/data/particles/generic/puff_round.png", "start": 20853620, "end": 20900205}, {"filename": "/data/particles/generic/snow.stcp", "start": 20900205, "end": 20901643}, {"filename": "/data/scripts/console.nut", "start": 20901643, "end": 20902987}, {"filename": "/data/scripts/default.nut", "start": 20902987, "end": 20903564}, {"filename": "/data/shader/shader100.frag", "start": 20903564, "end": 20904711}, {"filename": "/data/shader/shader100.vert", "start": 20904711, "end": 20905053}, {"filename": "/data/shader/shader330.frag", "start": 20905053, "end": 20906808}, {"filename": "/data/shader/shader330.vert", "start": 20906808, "end": 20907113}, {"filename": "/data/sounds/bigjump.wav", "start": 20907113, "end": 20931785}, {"filename": "/data/sounds/brick.wav", "start": 20931785, "end": 20938085}, {"filename": "/data/sounds/coin.wav", "start": 20938085, "end": 20995003}, {"filename": "/data/sounds/coin2.ogg", "start": 20995003, "end": 21001130}, {"filename": "/data/sounds/coins_cleared.ogg", "start": 21001130, "end": 21011681}, {"filename": "/data/sounds/convert_to_mono.sh", "start": 21011681, "end": 21012240}, {"filename": "/data/sounds/cracking.wav", "start": 21012240, "end": 21081468}, {"filename": "/data/sounds/crystallo-pop.ogg", "start": 21081468, "end": 21086180}, {"filename": "/data/sounds/crystallo-shardhit.ogg", "start": 21086180, "end": 21093004}, {"filename": "/data/sounds/crystallo-shatter.ogg", "start": 21093004, "end": 21103581}, {"filename": "/data/sounds/dartfire.wav", "start": 21103581, "end": 21110043}, {"filename": "/data/sounds/darthit.wav", "start": 21110043, "end": 21126797}, {"filename": "/data/sounds/door.wav", "start": 21126797, "end": 21253845}, {"filename": "/data/sounds/empty.wav", "start": 21253845, "end": 21254325}, {"filename": "/data/sounds/evil_nolok_jingle.ogg", "start": 21254325, "end": 21331640}, {"filename": "/data/sounds/excellent.wav", "start": 21331640, "end": 21356464}, {"filename": "/data/sounds/explosion.wav", "start": 21356464, "end": 21510018}, {"filename": "/data/sounds/fall.wav", "start": 21510018, "end": 21522216}, {"filename": "/data/sounds/fire-flower.wav", "start": 21522216, "end": 21584002}, {"filename": "/data/sounds/fire.ogg", "start": 21584002, "end": 21597880}, {"filename": "/data/sounds/firecracker.ogg", "start": 21597880, "end": 21605888}, {"filename": "/data/sounds/fireworks.wav", "start": 21605888, "end": 21689212}, {"filename": "/data/sounds/fizz.wav", "start": 21689212, "end": 21823400}, {"filename": "/data/sounds/flame.wav", "start": 21823400, "end": 21844620}, {"filename": "/data/sounds/flip.wav", "start": 21844620, "end": 21899960}, {"filename": "/data/sounds/flop.ogg", "start": 21899960, "end": 21911153}, {"filename": "/data/sounds/ghoul_recovering.ogg", "start": 21911153, "end": 21917761}, {"filename": "/data/sounds/ghoul_stunned.ogg", "start": 21917761, "end": 21924663}, {"filename": "/data/sounds/grow.ogg", "start": 21924663, "end": 21937569}, {"filename": "/data/sounds/grow.wav", "start": 21937569, "end": 22038847}, {"filename": "/data/sounds/grunts.ogg", "start": 22038847, "end": 22069137}, {"filename": "/data/sounds/gulp.wav", "start": 22069137, "end": 22083799}, {"filename": "/data/sounds/hop.ogg", "start": 22083799, "end": 22089580}, {"filename": "/data/sounds/hurt.wav", "start": 22089580, "end": 22123608}, {"filename": "/data/sounds/iceblock_bump.wav", "start": 22123608, "end": 22180312}, {"filename": "/data/sounds/icecrash.ogg", "start": 22180312, "end": 22191093}, {"filename": "/data/sounds/invincible_start.ogg", "start": 22191093, "end": 22237752}, {"filename": "/data/sounds/jump.wav", "start": 22237752, "end": 22260968}, {"filename": "/data/sounds/kick.wav", "start": 22260968, "end": 22274990}, {"filename": "/data/sounds/kill.wav", "start": 22274990, "end": 22316434}, {"filename": "/data/sounds/lava.wav", "start": 22316434, "end": 22581078}, {"filename": "/data/sounds/lifeup.wav", "start": 22581078, "end": 22675548}, {"filename": "/data/sounds/lightning.wav", "start": 22675548, "end": 22773768}, {"filename": "/data/sounds/locked.ogg", "start": 22773768, "end": 22788045}, {"filename": "/data/sounds/metal_hit.ogg", "start": 22788045, "end": 22793949}, {"filename": "/data/sounds/mr_tree.ogg", "start": 22793949, "end": 22800876}, {"filename": "/data/sounds/mr_treehit.ogg", "start": 22800876, "end": 22806967}, {"filename": "/data/sounds/normalize.sh", "start": 22806967, "end": 22807355}, {"filename": "/data/sounds/phone.wav", "start": 22807355, "end": 23248255}, {"filename": "/data/sounds/pop.ogg", "start": 23248255, "end": 23252620}, {"filename": "/data/sounds/pshit.ogg", "start": 23252620, "end": 23298608}, {"filename": "/data/sounds/rain.wav", "start": 23298608, "end": 25556606}, {"filename": "/data/sounds/retro_fall.wav", "start": 25556606, "end": 25598406}, {"filename": "/data/sounds/savebell2.wav", "start": 25598406, "end": 25786014}, {"filename": "/data/sounds/savebell_low.wav", "start": 25786014, "end": 25972064}, {"filename": "/data/sounds/saw.wav", "start": 25972064, "end": 26060334}, {"filename": "/data/sounds/shoot.wav", "start": 26060334, "end": 26065748}, {"filename": "/data/sounds/sizzle.ogg", "start": 26065748, "end": 26077636}, {"filename": "/data/sounds/skid.wav", "start": 26077636, "end": 26099874}, {"filename": "/data/sounds/splash.ogg", "start": 26099874, "end": 26141603}, {"filename": "/data/sounds/splash.wav", "start": 26141603, "end": 26221909}, {"filename": "/data/sounds/splat.wav", "start": 26221909, "end": 26269057}, {"filename": "/data/sounds/squish.wav", "start": 26269057, "end": 26297709}, {"filename": "/data/sounds/stomp.wav", "start": 26297709, "end": 26325867}, {"filename": "/data/sounds/switch.ogg", "start": 26325867, "end": 26338329}, {"filename": "/data/sounds/tada.ogg", "start": 26338329, "end": 26347009}, {"filename": "/data/sounds/thud.ogg", "start": 26347009, "end": 26355633}, {"filename": "/data/sounds/thunder.wav", "start": 26355633, "end": 26691923}, {"filename": "/data/sounds/ticking.wav", "start": 26691923, "end": 26700289}, {"filename": "/data/sounds/totem.ogg", "start": 26700289, "end": 26708679}, {"filename": "/data/sounds/trampoline.wav", "start": 26708679, "end": 26757233}, {"filename": "/data/sounds/tree_hit.ogg", "start": 26757233, "end": 26800282}, {"filename": "/data/sounds/tree_howling.ogg", "start": 26800282, "end": 26835251}, {"filename": "/data/sounds/tree_pinch.ogg", "start": 26835251, "end": 26842131}, {"filename": "/data/sounds/tree_suck.ogg", "start": 26842131, "end": 26871548}, {"filename": "/data/sounds/turnkey.ogg", "start": 26871548, "end": 26902046}, {"filename": "/data/sounds/upgrade.wav", "start": 26902046, "end": 27001072}, {"filename": "/data/sounds/warp.wav", "start": 27001072, "end": 27033128}, {"filename": "/data/sounds/waterfall.wav", "start": 27033128, "end": 27209572}, {"filename": "/data/sounds/welldone.ogg", "start": 27209572, "end": 27265657}, {"filename": "/data/sounds/willocatch.wav", "start": 27265657, "end": 27287205}, {"filename": "/data/sounds/willowisp.wav", "start": 27287205, "end": 27432603}, {"filename": "/data/sounds/wood.wav", "start": 27432603, "end": 27466439}, {"filename": "/data/sounds/yeti_gna.wav", "start": 27466439, "end": 27524951}, {"filename": "/data/sounds/yeti_roar.wav", "start": 27524951, "end": 27669179}, {"filename": "/data/sounds/yeti_throw1.wav", "start": 27669179, "end": 27753607}, {"filename": "/data/sounds/yeti_throw2.wav", "start": 27753607, "end": 27820055}, {"filename": "/data/sounds/yeti_throw3.wav", "start": 27820055, "end": 27878651}, {"filename": "/data/sounds/yeti_throw_big.wav", "start": 27878651, "end": 28020383}, {"filename": "/data/speech/penny_runt_01.ogg", "start": 28020383, "end": 28038209}, {"filename": "/data/speech/tux_hello.ogg", "start": 28038209, "end": 28106954}, {"filename": "/data/speech/tux_murp_01.ogg", "start": 28106954, "end": 28124573}, {"filename": "/data/speech/tux_rap.ogg", "start": 28124573, "end": 28689148}, {"filename": "/data/speech/tux_upset.ogg", "start": 28689148, "end": 28817668}], "remote_package_size": 28817668, "package_uuid": "sha256-2b453cd3a588eb2a7e18cbf2709a12dd50c9f0a6fa7462a342d8b62917ef9ccb"});

  })();
