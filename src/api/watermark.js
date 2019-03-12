import qs from 'qs';
// import * as is from '@lib/utils/is'
// import { objToQuery, } from '@lib/utils/index';
import fetch from '../utils/fetch';

export function login() {
    return fetch.post('/sessions');
}

export function getUploadAuthentications() {
    return fetch.get('/authentications');
}

export function createTask(data) {
    return fetch.post('/tasks', qs.stringify({
        file_id: data.file_id,
        args: JSON.stringify(data.args),
    }));
}

export function getTaskStatus(task_id) {
    return fetch.get(`/tasks/${task_id}`);
}
