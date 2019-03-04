const getters = {
    language: state => state.app.language,
    apiToken: state => state.user.apiToken,
    authentications: state => state.user.authentications,
    errorLogs: state => state.errorLog.logs,
};
export default getters;
