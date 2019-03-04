<template>
  <div id="app">
    <div class="page-header">
      <h1>在线图片去水印 <small>一键清除图片水印</small></h1>
    </div>
    <router-view/>
  </div>
</template>

<script>
export default {
    name: 'App',

    data() {
        return {
            loading: false,
        };
    },

    created: function() {
        this.fetchToken();
    },

    methods: {
        fetchToken() {
            this.loading = true;
            this.$store.dispatch('Login', {})
                .then(() => {
                    this.$store.dispatch('GetAuthentications', {})
                        .then(() => {
                            this.loading = false;
                        });
                });
        },
    },
};
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
