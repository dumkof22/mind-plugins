// Stremio Addons Index - Tüm eklentileri bir araya getiren ana dosya
// Instruction-based sistem için JavaScript/Node.js eklentileri

const animecix = require('./animecix-addon');
const belgeselx = require('./belgeselx-addon');
const canlitv = require('./canlitv-addon');
const cizgimax = require('./cizgimax-addon');
const cizgivedizi = require('./cizgivedizi-addon');
const dizibox = require('./dizibox-addon');
const hdfilmcehennemi = require('./hdfilmcehennemi-addon');
const kfilmizlesene = require('./4kfilmizlesene-addon');
const dizist = require('./dizist-addon');
const sinefy = require('./sinefy-addon');
const tv8 = require('./tv8-addon');
const webteizle = require('./webteizle-addon');
const kicktr = require('./kicktr-addon');
const webspor = require('./webspor-addon');
const videoExtractors = require('./video-extractors');

// Tüm eklentileri export et
module.exports = {
    // Eklentiler
    addons: {
        animecix,
        belgeselx,
        canlitv,
        cizgimax,
        cizgivedizi,
        dizibox,
        hdfilmcehennemi,
        '4kfilmizlesene': kfilmizlesene,
        dizist,
        sinefy,
        tv8,
        webteizle,
        kicktr,
        webspor
    },

    // Video extractors
    extractors: videoExtractors,

    // Tüm manifestleri al
    getAllManifests: () => {
        return [
            animecix.getManifest(),
            belgeselx.getManifest(),
            canlitv.getManifest(),
            cizgimax.getManifest(),
            cizgivedizi.getManifest(),
            dizibox.getManifest(),
            hdfilmcehennemi.getManifest(),
            kfilmizlesene.getManifest(),
            dizist.getManifest(),
            sinefy.getManifest(),
            tv8.getManifest(),
            webteizle.getManifest(),
            kicktr.getManifest(),
            webspor.getManifest()
        ];
    },

    // Belirli bir eklentiyi ID'ye göre al
    getAddonById: (id) => {
        const addons = {
            'community.animecix': animecix,
            'community.belgeselx': belgeselx,
            'community.canlitv': canlitv,
            'community.cizgimax': cizgimax,
            'community.cizgivedizi': cizgivedizi,
            'community.dizibox': dizibox,
            'community.hdfilmcehennemi': hdfilmcehennemi,
            'community.4kfilmizlesene': kfilmizlesene,
            'community.dizist': dizist,
            'community.sinefy': sinefy,
            'community.tv8': tv8,
            'community.webteizle': webteizle,
            'community.kicktr': kicktr,
            'community.webspor': webspor
        };

        return addons[id] || null;
    },

    // Global fetch result processor - tüm eklentiler için
    async processFetchResult(fetchResult) {
        // requestId'den hangi eklenti olduğunu belirle
        const requestId = fetchResult.requestId || '';

        // Extractor mı kontrol et
        if (requestId.includes('tauvideo') ||
            requestId.includes('odnoklassniki') ||
            requestId.includes('sibnet') ||
            requestId.includes('drive') ||
            requestId.includes('cizgiduo') ||
            requestId.includes('cizgipass')) {
            return await videoExtractors.processVideoExtractor(fetchResult);
        }

        // Purpose'a göre belirle
        if (fetchResult.purpose && fetchResult.purpose.startsWith('extract_')) {
            return await videoExtractors.processVideoExtractor(fetchResult);
        }

        // Eklentiye göre işle
        if (requestId.includes('animecix')) {
            return await animecix.processFetchResult(fetchResult);
        } else if (requestId.includes('belgesel')) {
            return await belgeselx.processFetchResult(fetchResult);
        } else if (requestId.includes('canlitv')) {
            return await canlitv.processFetchResult(fetchResult);
        } else if (requestId.includes('cizgivedizi')) {
            return await cizgivedizi.processFetchResult(fetchResult);
        } else if (requestId.includes('cizgimax') || requestId.includes('cizgi')) {
            return await cizgimax.processFetchResult(fetchResult);
        } else if (requestId.includes('dizibox')) {
            return await dizibox.processFetchResult(fetchResult);
        } else if (requestId.includes('hdfc') || requestId.includes('hdfilm')) {
            return await hdfilmcehennemi.processFetchResult(fetchResult);
        } else if (requestId.includes('4kfi')) {
            return await kfilmizlesene.processFetchResult(fetchResult);
        } else if (requestId.includes('dizist')) {
            return await dizist.processFetchResult(fetchResult);
        } else if (requestId.includes('sinefy')) {
            return await sinefy.processFetchResult(fetchResult);
        } else if (requestId.includes('tv8')) {
            return await tv8.processFetchResult(fetchResult);
        } else if (requestId.includes('webteizle')) {
            return await webteizle.processFetchResult(fetchResult);
        } else if (requestId.includes('kicktr')) {
            return await kicktr.processFetchResult(fetchResult);
        } else if (requestId.includes('webspor')) {
            return await webspor.processFetchResult(fetchResult);
        }

        console.log('⚠️  Unknown addon for requestId:', requestId);
        return { ok: false, error: 'Unknown addon' };
    }
};

