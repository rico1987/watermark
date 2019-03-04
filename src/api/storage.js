// import qs from 'qs';
import storageFetch from '../utils/storageFetch';

export function upload(postData) {
    return storageFetch.post('/files', postData);
}
