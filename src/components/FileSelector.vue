<template>
    <div class="container">
        <div class="file-selector" v-if="currentRouter === 'uploader' && !loading">
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
                                    <span class="file-name">{{ file.name }}</span>
                                    <span v-if="file.status === 'uploading'">上传中...<span>{{Math.floor(file.progress*100)}}%</span></span>
                                    <span v-if="file.status === 'processing'">转换中...<span>{{file.process_progress}}%</span></span>
                                    <span v-if="file.status === 'finished'">处理完成<a :href="file.processed_url" target="_blank">点击下载</a></span>
                                    <span v-if="file.status === 'failed'">处理失败</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p class="btn btn-primary" style="width: 100%;">上传文件</p>
                </div>
                <div class="col-md-9">
                    <div class="submit">
                        <span class="btn btn-primary" @click="submit">提交</span>
                    </div>
                    <div class="preview" @mouseup="onMouseUp()" @mousedown="onMouseDown()" @mousemove="onMouseMove()"  ref="position-container">
                        <div class="upload-info" v-if="uploaded < uploadQueue.length">
                            <p>当前上传 {{uploaded}} / {{uploadQueue.length}}</p>
                        </div>
                        <div class="wrapper" v-if="selectedFile">
                            <div v-bind:key="mask.id" v-for="mask in selectedFile.masks">
                                <div
                                    v-if="mask"
                                    class="mask"
                                    :style="{
                                        'top': mask.maskTop + 'px',
                                        'bottom': mask.maskBottom + 'px',
                                        'right': mask.maskRight + 'px',
                                        'left': mask.maskLeft + 'px'
                                        }"
                                >
                                    <span
                                    id="center"
                                    v-if="mask"
                                    @mousedown="onMouseDown(mask.id)"
                                    :class="{ 'moving': movingTarget === 'center' && movingMaskId === mask.id}"
                                    class="anchor center top-left"></span>
                                </div>
                                <span
                                    id="tl"
                                    :class="{ 'moving': movingTarget === 'tl' && movingMaskId === mask.id}"
                                    v-if="mask"
                                    @mousedown="onMouseDown(mask.id)"
                                    :style="{'top': mask.maskTop + 'px', 'left': mask.maskLeft + 'px'}"
                                    class="anchor top-left"></span>
                                <span
                                    id="tr"
                                    :class="{ 'moving': movingTarget === 'tr' && movingMaskId === mask.id}"
                                    v-if="mask"
                                    @mousedown="onMouseDown(mask.id)"
                                    :style="{'top': mask.maskTop + 'px', 'right': mask.maskRight + 'px'}"
                                    class="anchor top-right"></span>
                                <span
                                    id="bl"
                                    :class="{ 'moving': movingTarget === 'bl' && movingMaskId === mask.id}"
                                    v-if="mask"
                                    @mousedown="onMouseDown(mask.id)"
                                    :style="{'bottom': mask.maskBottom + 'px', 'left': mask.maskLeft + 'px'}"
                                    class="anchor bottom-left"></span>
                                <span
                                    id="br"
                                    :class="{ 'moving': movingTarget === 'br' && movingMaskId === mask.id}"
                                    v-if="mask"
                                    @mousedown="onMouseDown(mask.id)"
                                    :style="{'bottom': mask.maskBottom + 'px', 'right': mask.maskRight + 'px'}"
                                    class="anchor bottom-right"></span>
                            </div>
                        </div>
                        <div class="content">
                            <div class="image" ref="image-container" v-if="selectedFile && selectedFile.type === 'image'">
                                <img draggable="false" v-if="selectedFile.url" :src="selectedFile.url" />
                            </div>
                            <div class="video" ref="video-container" v-if="selectedFile && selectedFile.type === 'video'">
                                <video draggable="false" v-if="selectedFile.url" :src="selectedFile.url" controls="controls">
                                </video>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {createTask, getTaskStatus, } from '@/api/watermark';
import {generateRandomString, } from '@/utils';
import Cookies from 'js-cookie';

export default {
    name: 'FileSelector',
    data() {
        return {
            loading: false,
            parentHeight: 0,
            parentWidth: 0,
            isMoving: false,
            isCreating: false,
            isLoaded: false,
            movingTarget: null,
            movingMaskId: null,
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
        this.loading = true;
        const authentications = JSON.parse(Cookies.get('authentications'));
        // eslint-disable-next-line
        this.client = new OSS({
            region: authentications.region_id,
            accessKeyId: authentications.access_id,
            accessKeySecret: authentications.access_secret,
            stsToken: authentications.security_token,
            bucket: authentications.bucket,
        });
        this.loading = false;
    },

    methods: {

        submit: function() {
            // 提交任务
            for (let i = 0; i < this.uploadQueue.length; i++) {
                this.submitSingleTask(this.uploadQueue[i]);
                console.log(this.uploadQueue[i]);
            }
        },

        submitSingleTask: function(resource) {
            const postData = {
                file_id: resource.resource_id,
                args: {
                    watermarks: [],
                },
            };
            const ratio = resource.width / this.parentWidth;
            const masks = resource.masks;
            for (let i = 0; i < masks.length; i++) {
                postData.args.watermarks.push({
                    x: Math.floor(masks[i].maskLeft * ratio),
                    y: Math.floor(masks[i].maskTop * ratio),
                    w: Math.floor((this.parentWidth - masks[i].maskLeft - masks[i].maskRight) * ratio),
                    h: Math.floor((this.parentHeight - masks[i].maskTop - masks[i].maskBottom) * ratio),
                });
            }
            createTask(postData)
                .then((res) => {
                    const index = this.uploadQueue.findIndex((ele) => ele.resource_id === resource.resource_id);
                    if (res.data.status === '1') {
                        this.uploadQueue[index].status = 'processing';
                        this.uploadQueue[index].task_id = res.data.data.task_id;
                        this.uploadQueue[index].query_interval = setInterval(() => {
                            getTaskStatus(this.uploadQueue[index].task_id)
                                .then((res) => {
                                    console.log(res.data.data);
                                    if (res.data.status === '1') {
                                        const resource_id = res.data.data.source_file.resource_id;
                                        const index = this.uploadQueue.findIndex((ele) => ele.resource_id === resource_id);
                                        if (res.data.data.status === 2) {
                                            // 处理成功
                                            this.uploadQueue[index].status = 'finished';
                                            clearInterval(this.uploadQueue[index].query_interval);
                                            this.uploadQueue[index].query_interval = null;
                                            this.uploadQueue[index].processed_url = res.data.data.target_file && res.data.data.target_file.url;
                                        } else if (res.data.data.status === -10) {
                                            // 处理失败
                                            this.uploadQueue[index].status = 'failed';
                                            clearInterval(this.uploadQueue[index].query_interval);
                                            this.uploadQueue[index].query_interval = null;
                                        } else if (res.data.data.status === 1) {
                                            // 处理中
                                            this.uploadQueue[index].process_progress = res.data.data.progress;
                                        }
                                    }
                                })
                                .catch((err) => {
                                    console.log(err);
                                });
                        }, 500);
                    }
                })
                .catch((err) => {
                    throw (err);
                });
        },

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
                resource_id: null,
                task_id: null,
                process_progress: 0,
                query_interval: null,
                processed_url: null,
                key: key,
                progress: 0,
                status: 'uploading',
                url: null,
                type: null,
                width: null,
                height: null,
                masks: [
                    {
                        id: 0,
                        maskTop: 0,
                        maskBottom: 0,
                        maskLeft: 0,
                        maskRight: 0,
                    },
                ],
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
                                this.uploadQueue[index]['resource_id'] = res.data.data.resource.resource_id;
                            } else if (this.uploadQueue[index]['type'] === 'video') {
                                this.uploadQueue[index]['url'] = res.data.data.resource.video_url;
                                this.uploadQueue[index]['resource_id'] = res.data.data.resource.resource_id;
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

        onMouseDown: function(id) {
            if (id || id === 0) {
                this.movingMaskId = id;
                this.movingTarget = event.target.id;
                this.isMoving = true;
                this.isCreating = false;
                event.stopPropagation();
            } else if (event.target.getAttribute('class') !== 'mask') {
                if (this.selectedFile.masks.length > 4) {
                    alert('最多只能添加5个图层');
                    return false;
                }
                const maskLength = this.selectedFile.masks.length;
                const positonParent = this.$refs['position-container'];
                const parentScreenLeft = positonParent.offsetLeft;
                const parrentScreenTop = positonParent.offsetTop;
                this.selectedFile.masks.push({
                    id: maskLength,
                    maskTop: event.clientY - parrentScreenTop,
                    maskBottom: this.parentHeight - event.clientY + parrentScreenTop,
                    maskLeft: event.clientX - parentScreenLeft,
                    maskRight: this.parentWidth - event.clientX + parentScreenLeft,
                });
                this.isCreating = true;
                this.isMoving = false;
            }
        },

        onMouseUp: function() {
            this.movingTarget = null;
            this.movingMaskId = null;
            this.isCreating = false;
            this.isMoving = false;
            console.log(this.isCreating);
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
                        this.selectedFile.masks[this.movingMaskId].maskLeft = 0;
                    } else if (calLeft > this.parentWidth - this.selectedFile.masks[this.movingMaskId].maskRight) {
                        this.selectedFile.masks[this.movingMaskId].maskLeft = this.parentWidth - this.selectedFile.masks[this.movingMaskId].maskRight - 1;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskLeft = calLeft;
                    }
                    if (calTop < 0) {
                        this.selectedFile.masks[this.movingMaskId].maskTop = 0;
                    } else if (calTop > this.parentHeight - this.selectedFile.masks[this.movingMaskId].maskBottom) {
                        this.selectedFile.masks[this.movingMaskId].maskTop = this.parentHeight - this.selectedFile.masks[this.movingMaskId].maskBottom - 1;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskTop = calTop;
                    }
                } else if (this.movingTarget === 'tr') {
                    const calRight = parentScreenLeft + this.parentWidth - event.clientX;
                    const calTop = event.clientY - parrentScreenTop;
                    if (calRight < 0) {
                        this.selectedFile.masks[this.movingMaskId].maskRight = 0;
                    } else if (calRight > this.parentWidth - this.selectedFile.masks[this.movingMaskId].maskLeft) {
                        this.selectedFile.masks[this.movingMaskId].maskRight = this.parentWidth - this.selectedFile.masks[this.movingMaskId].maskLeft - 1;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskRight = calRight;
                    }
                    if (calTop < 0) {
                        this.selectedFile.masks[this.movingMaskId].maskTop = 0;
                    } else if (calTop > this.parentHeight - this.selectedFile.masks[this.movingMaskId].maskBottom) {
                        this.selectedFile.masks[this.movingMaskId].maskTop = this.parentHeight - this.selectedFile.masks[this.movingMaskId].maskBottom - 1;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskTop = calTop;
                    }
                } else if (this.movingTarget === 'bl') {
                    const calLeft = event.clientX - parentScreenLeft;
                    const calBottom = this.parentHeight + parrentScreenTop - event.clientY;
                    if (calLeft < 0) {
                        this.selectedFile.masks[this.movingMaskId].maskLeft = 0;
                    } else if (calLeft > this.parentWidth - this.selectedFile.masks[this.movingMaskId].maskRight) {
                        this.selectedFile.masks[this.movingMaskId].maskLeft = this.parentWidth - this.selectedFile.masks[this.movingMaskId].maskRight - 1;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskLeft = calLeft;
                    }
                    if (calBottom < 0) {
                        this.selectedFile.masks[this.movingMaskId].maskBottom = 0;
                    } else if (calBottom > this.parentHeight - this.selectedFile.masks[this.movingMaskId].maskTop - 1) {
                        this.selectedFile.masks[this.movingMaskId].maskBottom = this.parentHeight - this.selectedFile.masks[this.movingMaskId].maskTop - 1;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskBottom = calBottom;
                    }
                } else if (this.movingTarget === 'br') {
                    const calRight = parentScreenLeft + this.parentWidth - event.clientX;
                    const calBottom = this.parentHeight + parrentScreenTop - event.clientY;
                    if (calRight < 0) {
                        this.selectedFile.masks[this.movingMaskId].maskRight = 0;
                    } else if (calRight > this.parentWidth - this.selectedFile.masks[this.movingMaskId].maskLeft) {
                        this.selectedFile.masks[this.movingMaskId].maskRight = this.parentWidth - this.selectedFile.masks[this.movingMaskId].maskLeft - 1;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskRight = calRight;
                    }
                    if (calBottom < 0) {
                        this.selectedFile.masks[this.movingMaskId].maskBottom = 0;
                    } else if (calBottom > this.parentHeight - this.selectedFile.masks[this.movingMaskId].maskTop - 1) {
                        this.selectedFile.masks[this.movingMaskId].maskBottom = this.parentHeight - this.selectedFile.masks[this.movingMaskId].maskTop - 1;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskBottom = calBottom;
                    }
                } else if (this.movingTarget === 'center') {
                    const calX = event.movementX;
                    const calY = event.movementY;
                    if (this.selectedFile.masks[this.movingMaskId].maskLeft + calX < 0) {
                        const preLeft = this.selectedFile.masks[this.movingMaskId].maskLeft;
                        this.selectedFile.masks[this.movingMaskId].maskRight = this.selectedFile.masks[this.movingMaskId].maskRight - preLeft;
                        this.selectedFile.masks[this.movingMaskId].maskLeft = 0;
                    } else if (this.selectedFile.masks[this.movingMaskId].maskRight - calX < 0) {
                        const preRight = this.selectedFile.masks[this.movingMaskId].maskRight;
                        this.selectedFile.masks[this.movingMaskId].maskLeft = this.selectedFile.masks[this.movingMaskId].maskLeft + preRight;
                        this.selectedFile.masks[this.movingMaskId].maskRight = 0;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskLeft = this.selectedFile.masks[this.movingMaskId].maskLeft + calX;
                        this.selectedFile.masks[this.movingMaskId].maskRight = this.selectedFile.masks[this.movingMaskId].maskRight - calX;
                    }
                    if (this.selectedFile.masks[this.movingMaskId].maskTop + calY < 0) {
                        const preTop = this.selectedFile.masks[this.movingMaskId].maskTop;
                        this.selectedFile.masks[this.movingMaskId].maskBottom = this.selectedFile.masks[this.movingMaskId].maskBottom - preTop;
                        this.selectedFile.masks[this.movingMaskId].maskTop = 0;
                    } else if (this.selectedFile.masks[this.movingMaskId].maskBottom - calY < 0) {
                        const preBottom = this.selectedFile.masks[this.movingMaskId].maskBottom;
                        this.selectedFile.masks[this.movingMaskId].maskTop = this.selectedFile.masks[this.movingMaskId].maskTop + preBottom;
                        this.selectedFile.masks[this.movingMaskId].maskBottom = 0;
                    } else {
                        this.selectedFile.masks[this.movingMaskId].maskTop = this.selectedFile.masks[this.movingMaskId].maskTop + calY;
                        this.selectedFile.masks[this.movingMaskId].maskBottom = this.selectedFile.masks[this.movingMaskId].maskBottom - calY;
                    }
                }
            } else if (this.isCreating) {
                const calX = event.movementX;
                const calY = event.movementY;
                const maskLength = this.selectedFile.masks.length;
                if (calX > 0) {
                    if (this.selectedFile.masks[maskLength - 1].maskRight - calX < 0) {
                        this.selectedFile.masks[maskLength - 1].maskRight = 0;
                    } else {
                        this.selectedFile.masks[maskLength - 1].maskRight = this.selectedFile.masks[maskLength - 1].maskRight - calX;
                    }
                }
                if (calY > 0) {
                    if (this.selectedFile.masks[maskLength - 1].maskBottom - calY < 0) {
                        this.selectedFile.masks[maskLength - 1].maskBottom = 0;
                    } else {
                        this.selectedFile.masks[maskLength - 1].maskBottom = this.selectedFile.masks[maskLength - 1].maskBottom - calY;
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
            if (file.status === 'uploading') {
                alert('上传中，请稍等');
            }
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
                this.selectedFile.masks[0]['maskTop'] = this.selectedFile.masks[0]['maskBottom'] = this.bottom;
                this.selectedFile.masks[0]['maskLeft'] = this.selectedFile.masks[0]['maskRight'] = this.left;
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
    border: 1px solid blue;
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
}
span.center{
    position: absolute;
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
.preview .content .image, .preview .content .video {
    width: 100%;
    height: 100%;
}
.preview .content .image img, .preview .content .video video {
    width: 100%;
    height: auto;
}
</style>
