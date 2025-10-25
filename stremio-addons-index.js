// Stremio Addons Index - Tüm eklentileri bir araya getiren ana dosya
// Instruction-based sistem için JavaScript/Node.js eklentileri

const animecix = require('./animecix-addon');
const belgeselx = require('./belgeselx-addon');
const canlitv = require('./canlitv-addon');
const cizgimax = require('./cizgimax-addon');
const cizgivedizi = require('./cizgivedizi-addon');
const dizibox = require('./dizibox-addon');
const hdfilmcehennemi = require('./hdfilmcehennemi-addon');
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
        hdfilmcehennemi
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
            hdfilmcehennemi.getManifest()
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
            'community.hdfilmcehennemi': hdfilmcehennemi
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
        }

        console.log('⚠️  Unknown addon for requestId:', requestId);
        return { ok: false, error: 'Unknown addon' };
    }
};

