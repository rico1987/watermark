// import qs from 'qs'
// import * as is from '@lib/utils/is'
// import { objToQuery, } from '@lib/utils/index';
import fetch from '../utils/fetch';

export function login() {
    return fetch.post('/sessions');
}

export function getUploadAuthentications() {
    return fetch.get('/authentications');
}
