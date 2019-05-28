import { senderFn } from './ipc';
import * as tracks from './database/track';
import { Album, Artist, Track,  Video, PlayList } from '@/util/models';

/**
 * @param {number[]} ids
 */
export async function getSongDetail(ids) {
    try {
        const ts = await tracks.get(ids);
        return ts.map(t => new Track(t));
    } catch (missed) {
        const tasks = [];
        for (let i = 0; i < missed.length; i += 1000) {
            const ids = missed.slice(i, i + 1000);
            const promise = senderFn('getSongDetail', ids).then(resp => {
                if (resp.code === 200) {
                    tracks.insert(resp.songs);
                }
            });
            tasks.push(promise);
        }
        await Promise.all(tasks);
        // some tracks may 404 and we got empty response. ignore missing tracks here
        const ts = await tracks.get(ids, true);
        return ts.map(t => new Track(t));
    }
}

export async function getPlaylistDetail(id, limit = 0) {
    /** @type {Types.ListDetailRes} */
    const resp = await senderFn('getListDetail', id, limit);
    if (resp.code === 200) {
        return new PlayList(resp.playlist);
    }
}

export async function getAlbumDetail(id) {
    /** @type {Types.AlbumDetailWRes} */
    const resp = await senderFn('getAlbumDetailW', id);
    if (resp.code === 200) {
        // @ts-ignore
        tracks.upsert(resp.songs);
        return new Album({ ...resp.album, songs: resp.songs });
    }
}

export async function getArtistDetail(id) {
    /** @type {Types.ArtistDetailWRes} */
    const resp = await senderFn('getArtistDetailW', id);
    if (resp.code === 200) {
        // @ts-ignore
        tracks.upsert(resp.hotSongs);
        return {
            detail: new Artist(resp.artist),
            hotSongs: resp.hotSongs.map(s => new Track(s))
        };
    }
}

export async function getVideoDetail(id, type) {
    if (type === 0) {
        /** @type {Types.MVDetailRes} */
        const resp = await senderFn('getMVDetail', id);
        if (resp.code === 200) {
            return new Video({ ...resp.data, type, subed: resp.subed });
        }
    } else if (type === 1) {
        /** @type {Types.VideoDetailRes} */
        const resp = await senderFn('getVideoDetail', id);
        if (resp.code === 200) {
            return new Video({ ...resp.data, type });
        }
    }
}