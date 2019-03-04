import Cookies from 'js-cookie';
import {
    login,
    getUploadAuthentications,
} from '@/api/watermark';

const user = {
    state: {
        apiToken: '',
        authentications: null,
    },

    mutations: {
        SET_API_TOKEN: (state, apiToken) => {
            state.apiToken = apiToken;
        },

        SET_AUTHENTICATIONS: (state, authentications) => {
            state.authentications = authentications;
        },
    },

    actions: {
        Login({ commit, }) {
            return new Promise((resolve, reject) => {
                login()
                    .then((res) => {
                        if (res.status === 200) {
                            const data = res.data.data;
                            commit('SET_API_TOKEN', data.user.api_token);
                            Cookies.set('apiToken', data.user.api_token);
                            resolve();
                        } else {
                            reject(res);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        },

        GetAuthentications({ commit, }) {
            return new Promise((resolve, reject) => {
                getUploadAuthentications()
                    .then((res) => {
                        if (res.status === 200) {
                            commit('SET_AUTHENTICATIONS', res.data.data);
                            Cookies.set('authentications', res.data.data);
                            resolve();
                        } else {
                            reject(res);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        },
    },
};

export default user;
