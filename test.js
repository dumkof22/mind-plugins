// probe-propalas-parallel.js
// Usage: node probe-propalas-parallel.js https://propalas.cfd
// Requirements: npm install axios p-limit
const fs = require('fs');
const axios = require('axios');
const pLimit = require('p-limit');

const base = process.argv[2];
if (!base) { console.error('Usage: node probe-propalas-parallel.js https://propalas.cfd'); process.exit(1); }

const aesKey = 'ywevqtjrurkwtqgz'; // inat-new.js'den örnek; gerekirse değiştirin
const paths = [
    '/tv/cable.php', '/tv/list2.php', '/tv/sinema.php', '/tv/belgesel.php', '/tv/ulusal.php',
    '/tv/haber.php', '/tv/cocuk.php', '/tv/dini.php', '/ex/index.php', '/ga/index.php',
    '/max/index.php', '/nf/index.php', '/dsny/index.php', '/amz/index.php', '/hb/index.php',
    '/tbi/index.php', '/film/mubi.php', '/ccc/index.php', '/yabanci-dizi/index.php',
    '/yerli-dizi/index.php', '/film/yerli-filmler.php', '/film/4k-film-exo.php',
    '/tv/list.php', '/tv/list3.php', '/json.php', '/api.php'
];

const concurrency = 8;
const retries = 2;
const timeoutMs = 15000;
const limit = pLimit(concurrency);

async function tryPost(url, attempt = 0) {
    try {
        const resp = await axios.post(url, `1=${aesKey}&0=${aesKey}`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'speedrestapi',
                'Referer': 'https://speedrestapi.com/',
                'X-Requested-With': 'com.bp.box'
            },
            timeout: timeoutMs,
            validateStatus: () => true // we want non-2xx bodies too
        });
        return { ok: true, status: resp.status, headers: resp.headers, body: resp.data };
    } catch (err) {
        if (attempt < retries) return tryPost(url, attempt + 1);
        return { ok: false, error: err.message };
    }
}

(async () => {
    const results = [];
    const tasks = paths.map(p => limit(async () => {
        const url = base.replace(/\/$/, '') + p;
        process.stdout.write(`Probing ${url}\n`);
        const r = await tryPost(url);
        // snippet safe-string
        let snippet = null;
        try { snippet = typeof r.body === 'string' ? r.body.slice(0, 500) : JSON.stringify(r.body).slice(0, 500); } catch (e) { snippet = String(r.body).slice(0, 200); }
        const entry = { url, result: r, snippet };
        results.push(entry);
        process.stdout.write(` -> ${r.ok ? r.status : 'ERR'} ${snippet ? snippet.replace(/\n/g, ' ') : ''}\n`);
    }));

    await Promise.all(tasks);
    fs.writeFileSync('propalas-probe-results.json', JSON.stringify({ base, date: new Date().toISOString(), results }, null, 2));
    console.log('Saved propalas-probe-results.json');
})();
