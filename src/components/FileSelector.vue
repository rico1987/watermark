<template>
    <div class="container">
        <div class="file-selector" v-if="currentRouter === 'uploader'">
            <div class="jumbotron" @click="uploadFile()">
            <span>+</span>
            </div>
            <input type="file" ref="fileInput" style="display:none;" multiple="multiple" @change="onFileChange()" />
        </div>
        <div class="file-list" v-if="currentRouter === 'fileList'">
            <div class="row">
                <div class="col-md-3">
                    <h2>文件列表</h2>
                    <table class="table table-striped">
                        <tbody>
                            <tr
                                v-bind:key="file.key"
                                v-for="file in uploadQueue"
                                @click="selectFile(file)"
                            >
                                <td :class="{ 'uploaded': file.progress === 1}">
                                    {{ file.name }}
                                    <progress v-if="file.progress < 1" :value="Math.floor(file.progress * 100)" max="100"></progress>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p class="btn btn-primary" style="width: 100%;">上传文件</p>
                </div>
                <div class="col-md-9">
                    <div class="preview" @mouseup="onMouseUp()" @mousemove="onMouseMove()"  ref="position-container">
                        <div class="upload-info" v-if="uploaded < uploadQueue.length">
                            <p>当前上传 {{uploaded}} / {{uploadQueue.length}}</p>
                        </div>
                        <div
                            v-if="selectedFile"
                            class="mask"
                            :style="{
                                'top': selectedFile.maskTop + 'px',
                                'bottom': selectedFile.maskBottom + 'px',
                                'right': selectedFile.maskRight + 'px',
                                'left': selectedFile.maskLeft + 'px'
                                }"
                        >
                            <span
                            id="center"
                            v-if="selectedFile"
                            @mousedown="onMouseDown()"
                            :class="{ 'moving': movingTarget === 'center'}"
                            class="anchor center top-left"></span>
                        </div>
                        <span
                            id="tl"
                            :class="{ 'moving': movingTarget === 'tl'}"
                            v-if="selectedFile"
                            @mousedown="onMouseDown()"
                            :style="{'top': selectedFile.maskTop + 'px', 'left': selectedFile.maskLeft + 'px'}"
                            class="anchor top-left"></span>
                        <span
                            id="tr"
                            :class="{ 'moving': movingTarget === 'tr'}"
                            v-if="selectedFile"
                            @mousedown="onMouseDown()"
                            :style="{'top': selectedFile.maskTop + 'px', 'right': selectedFile.maskRight + 'px'}"
                            class="anchor top-right"></span>
                        <span
                            id="bl"
                            :class="{ 'moving': movingTarget === 'bl'}"
                            v-if="selectedFile"
                            @mousedown="onMouseDown()"
                            :style="{'bottom': selectedFile.maskBottom + 'px', 'left': selectedFile.maskLeft + 'px'}"
                            class="anchor bottom-left"></span>
                        <span
                            id="br"
                            :class="{ 'moving': movingTarget === 'br'}"
                            v-if="selectedFile"
                            @mousedown="onMouseDown()"
                            :style="{'bottom': selectedFile.maskBottom + 'px', 'right': selectedFile.maskRight + 'px'}"
                            class="anchor bottom-right"></span>

                        <div class="content">
                            <div class="image" ref="image-container" v-if="selectedFile && selectedFile.type === 'image'">
                                <img draggable="false" v-if="selectedFile.url" :src="selectedFile.url" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
// import { upload, } from '@/api/storage';
import {generateRandomString, } from '@/utils';
import Cookies from 'js-cookie';

export default {
    name: 'FileSelector',
    data() {
        return {
            parentHeight: 0,
            parentWidth: 0,
            isMoving: false,
            isLoaded: false,
            movingTarget: null,
            right: 0,
            left: 0,
            top: 0,
            bottom: 0,
            selectedFile: null,
            currentRouter: 'uploader',
            uploaded: 0,
            uploadQueue: [],
            fileList: [],
            client: null,
            pictureFileExtensions: [ '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.pic', '.tif', ],
            audioFileExtensions: [ '.wav', '.aif', '.au', '.mp3', '.ram', '.wma', '.mmf', '.amr', '.aac', '.flac', ],
            videoFileExtensions: [ '.avi', '.mov', '.mpg', '.mpeg', '.vob', '.asf', '.3gp', '.mp4', '.wmv', '.rm', '.rmvb', '.flv', '.mkv', ],
        };
    },

    created: function() {
        const authentications = JSON.parse(Cookies.get('authentications'));
        // eslint-disable-next-line
        this.client = new OSS({
            region: authentications.region_id,
            accessKeyId: authentications.access_id,
            accessKeySecret: authentications.access_secret,
            stsToken: authentications.security_token,
            bucket: authentications.bucket,
        });
    },

    methods: {
        uploadFile: function() {
            this.$refs.fileInput.click();
        },

        onFileChange: function() {
            const files = event.currentTarget.files;
            // 批量上传
            this.fileList = files;
            this.router = 'dashboard';
            for (var i = 0; i < this.fileList.length; i++) {
                this.fileList[i]['status'] = 'uploading';
                this.fileList[i]['progress'] = 0;
            }
            // todo
            // 验证文件类型，大小
            this.doUpload();
            this.currentRouter = 'fileList';
        },

        doUpload: function() {
            this.uploadQueue = [];
            for (let i = 0; i < this.fileList.length; i++) {
                this.uploadSingleFile(this.fileList[i]);
            }
        },

        uploadSingleFile: function(file) {
            const authentications = JSON.parse(Cookies.get('authentications'));
            const extension = file.name.substring(file.name.lastIndexOf('.'));
            const key = authentications.path[this.getFileType(file.name)] +
                generateRandomString(10) + extension;
            file['key'] = key;
            this.uploadQueue.push({
                name: file.name,
                key: key,
                progress: 0,
                status: 'uploading',
                url: null,
                type: null,
                width: null,
                height: null,
                maskTop: 0,
                maskBottom: 0,
                maskLeft: 0,
                maskRight: 0,
                touched: false,
            });
            const url = authentications['callback']['callbackUrl'];
            const callbackBody = authentications['callback']['callbackBody'];
            const callback = {
                url: url,
                body: callbackBody,
            };

            this.client.multipartUpload(key, file, {
                cancelFlag: true,
                callback: callback,
                progress: this.onProgress,
                partSize: 500 * 1024,
                headers: {
                    'Content-Disposition': encodeURI(file.name),
                },
            })
                .then((res) => {
                    if (res.data.status === '1') {
                        let key = res.name;
                        let index;
                        for (let i = 0; i < this.uploadQueue.length; i++) {
                            if (this.uploadQueue[i]['key'] === key) {
                                index = i;
                            }
                        }
                        if (index > -1) {
                            this.uploadQueue[index]['progress'] = 1;
                            this.uploadQueue[index]['status'] = 'uploaded';
                            this.uploadQueue[index]['type'] = res.data.data.resource.type;
                            if (this.uploadQueue[index]['type'] === 'image') {
                                this.uploadQueue[index]['url'] = res.data.data.resource.image_url;
                                this.uploadQueue[index]['width'] = res.data.data.resource.image_width;
                                this.uploadQueue[index]['height'] = res.data.data.resource.image_height;
                            }
                            this.uploaded++;
                        }
                    }
                });
        },

        onProgress: function(progress, checkpoint, res) {
            if (checkpoint && checkpoint.name) {
                let index;
                for (let i = 0; i < this.uploadQueue.length; i++) {
                    if (this.uploadQueue[i]['key'] === checkpoint.name) {
                        index = i;
                    }
                }
                if (index > -1) {
                    this.uploadQueue[index]['progress'] = progress;
                    if (progress === 1) {
                        this.uploadQueue[index]['status'] = 'uploaded';
                    }
                }
            }
        },

        onMouseDown: function() {
            this.movingTarget = event.target.id;
            this.isMoving = true;
        },

        onMouseUp: function() {
            this.movingTarget = null;
            this.isMoving = false;
        },

        onMouseMove: function() {
            const positonParent = this.$refs['position-container'];
            const parentScreenLeft = positonParent.offsetLeft;
            const parrentScreenTop = positonParent.offsetTop;
            if (this.isMoving) {
                if (this.movingTarget === 'tl') {
                    const calLeft = event.clientX - parentScreenLeft;
                    const calTop = event.clientY - parrentScreenTop;
                    if (calLeft < 0) {
                        this.selectedFile.maskLeft = 0;
                    } else if (calLeft > this.parentWidth - this.selectedFile.maskRight) {
                        this.selectedFile.maskLeft = this.parentWidth - this.selectedFile.maskRight - 1;
                    } else {
                        this.selectedFile.maskLeft = calLeft;
                    }
                    if (calTop < 0) {
                        this.selectedFile.maskTop = 0;
                    } else if (calTop > this.parentHeight - this.selectedFile.maskBottom) {
                        this.selectedFile.maskTop = this.parentHeight - this.selectedFile.maskBottom - 1;
                    } else {
                        this.selectedFile.maskTop = calTop;
                    }
                } else if (this.movingTarget === 'tr') {
                    const calRight = parentScreenLeft + this.parentWidth - event.clientX;
                    const calTop = event.clientY - parrentScreenTop;
                    if (calRight < 0) {
                        this.selectedFile.maskRight = 0;
                    } else if (calRight > this.parentWidth - this.selectedFile.maskLeft) {
                        this.selectedFile.maskRight = this.parentWidth - this.selectedFile.maskLeft - 1;
                    } else {
                        this.selectedFile.maskRight = calRight;
                    }
                    if (calTop < 0) {
                        this.selectedFile.maskTop = 0;
                    } else if (calTop > this.parentHeight - this.selectedFile.maskBottom) {
                        this.selectedFile.maskTop = this.parentHeight - this.selectedFile.maskBottom - 1;
                    } else {
                        this.selectedFile.maskTop = calTop;
                    }
                } else if (this.movingTarget === 'bl') {
                    const calLeft = event.clientX - parentScreenLeft;
                    const calBottom = this.parentHeight + parrentScreenTop - event.clientY;
                    if (calLeft < 0) {
                        this.selectedFile.maskLeft = 0;
                    } else if (calLeft > this.parentWidth - this.selectedFile.maskRight) {
                        this.selectedFile.maskLeft = this.parentWidth - this.selectedFile.maskRight - 1;
                    } else {
                        this.selectedFile.maskLeft = calLeft;
                    }
                    if (calBottom < 0) {
                        this.selectFile.maskBottom = 0;
                    } else if (calBottom > this.parentHeight - this.selectedFile.maskTop - 1) {
                        this.selectFile.maskBottom = this.parentHeight - this.selectedFile.maskTop - 1;
                    } else {
                        this.selectedFile.maskBottom = calBottom;
                    }
                } else if (this.movingTarget === 'br') {
                    const calRight = parentScreenLeft + this.parentWidth - event.clientX;
                    const calBottom = this.parentHeight + parrentScreenTop - event.clientY;
                    if (calRight < 0) {
                        this.selectedFile.maskRight = 0;
                    } else if (calRight > this.parentWidth - this.selectedFile.maskLeft) {
                        this.selectedFile.maskRight = this.parentWidth - this.selectedFile.maskLeft - 1;
                    } else {
                        this.selectedFile.maskRight = calRight;
                    }
                    if (calBottom < 0) {
                        this.selectedFile.maskBottom = 0;
                    } else if (calBottom > this.parentHeight - this.selectedFile.maskTop - 1) {
                        this.selectedFile.maskBottom = this.parentHeight - this.selectedFile.maskTop - 1;
                    } else {
                        this.selectedFile.maskBottom = calBottom;
                    }
                }
            }
        },

        getFileType: function(fileName) {
            var extension = fileName.substring(fileName.lastIndexOf('.'))
                .toLowerCase();
            if (this.pictureFileExtensions.some((ele) => ele === extension)) {
                return 'images';
            } else if (this.audioFileExtensions.some((ele) => ele === extension)) {
                return 'audios';
            } else if (this.videoFileExtensions.some((ele) => ele === extension)) {
                return 'videos';
            } else {
                return 'resources';
            }
        },

        selectFile: function(file) {
            this.isMoving = false;
            this.selectedFile = file;
            // 计算图片高度
            const positonParent = this.$refs['position-container'];
            this.parentWidth = positonParent.offsetWidth;
            this.right = this.left = this.parentWidth * 0.3;
            if (file['type'] === 'image') {
                this.parentHeight = file['height'] * this.parentWidth / file['width'];
                this.top = this.bottom = this.parentHeight * 0.3;
            }
            if (!this.selectedFile.touched) {
                this.selectedFile.maskTop = this.selectedFile.maskBottom = this.bottom;
                this.selectedFile.maskLeft = this.selectedFile.maskRight = this.left;
                this.selectedFile.touched = true;
            }
        },
    },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.jumbotron{
  cursor: pointer;
}
.col-md-9{
    position: unset;
}

.table tr .progress {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}
td.uploaded{
    background-color: green;
    color: white;
    cursor: pointer;
}

.preview{
    min-height: 400px;
    width: 100%;
    position: relative;
}
.preview * {
    user-select: none;
}
.preview .mask{
    position: absolute;
    border: 1px solid #eee;
    background-color: aqua;
    opacity: 0.4;
}
span.anchor {
    cursor: pointer;
    width: 10px;
    height: 10px;
    display: block;
    position: absolute;
    z-index: 10;
    background-color: red;
}
span.center{
    position: absolute;
    background-color: blue;
    display: block;
    top: 10px;
    left: 10px;
    right: 10px;
    bottom: 10px;
    z-index: 100;
    width: auto;
    height: auto;
}
span.anchor:hover {
    cursor:crosshair;
}
span.center:hover {
    cursor: move!important;
}

.preview .content {
    width: 100%;
    height: 100%;
}
.preview .content .image {
    width: 100%;
    height: 100%;
}
.preview .content .image img {
    width: 100%;
    height: auto;
}
</style>
