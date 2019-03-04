import Vue from 'vue';
import Router from 'vue-router';
import FileSelector from '@/components/FileSelector';

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'FileSelector',
            component: FileSelector,
        },
    ],
});
