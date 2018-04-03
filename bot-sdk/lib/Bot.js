/**
 * Copyright (c) 2017 Baidu, Inc. All Rights Reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @file Bot class
 * @author kira3007<yuanpeng01@baidu.com>
 */

'use strict';

const Request = require('./Request');
const Response = require('./Response');
const Certificate = require('./Certificate');
const BotMonitor = require('bot-monitor-sdk');
const fs = require('fs');

var privateKey = '';

/**
 * Bot基类. 请继承此类
 *
 * @example
 * const BaseBot = require('bot-sdk');
 * class MyBot extends BaseBot {
 *     constructor(postData) {
 *          super(postData);
 *          //...
 *     }
 * }
 *
 */
class Bot {

    /**
     * 构造函数，以及DuerOS请求bot的request为参数，request协议参考[http://TODO]
     *
     * @param {Object} postData DuerOS请求body
     */
    constructor(postData) {
        this.request = new Request(postData);

        this.session = this.request.getSession();

        this.nlu = this.request.getNlu();
        this.response = new Response(this.request, this.session, this.nlu); 

        this._eventHandler = new Map();
        this._intentHandler= new Map();

        this.botMonitor = new BotMonitor(postData);
    }

    /**
     * 对SessionEnded添加处理函数
     *
     * @example
     * this.addLaunchHandler(()=>{
     *      // 进入bot，提示用户如何操作
     * });
     *
     * @param {Function} handler 意图处理函数。返回值非null，将作为bot的response返回DuerOS
     *                        函数返回值参考Response.build() 的输入参数
     * @return {Bot} 返回自己
     * @public
     */
    addLaunchHandler(handler) {
        return this._addHandler('LaunchRequest', handler);
    }

    /**
     * 对SessionEnded添加处理函数
     *
     * @example
     * this.addSessionEndedHandler(()=>{
     *     // todo some clear job
     *     // this.clearSession()
     * });
     *
     * @param {Function} handler 意图处理函数。返回值非null，将作为bot的response返回DuerOS
     *                        函数返回值参考Response.build() 的输入参数
     * @return {Bot} 返回自己
     * @public
     */
    addSessionEndedHandler(handler) {
        return this._addHandler('SessionEndedRequest', handler);
    }

    /**
     * 对一个intent添加处理函数
     *
     * @example
     * this.addIntentHandler('intentName', ()=>{
     *     //this.getSlot('slotName');
     * });
     *
     * @param {string} intent 意图名：'intentName'
     * @param {Function} handler 意图处理函数。返回值非null，将作为bot的response返回DuerOS
     *                        函数返回值参考Response.build() 的输入参数
     * @return {Bot} 返回自己
     * @public
     */
    addIntentHandler(intent, handler) {
        return this._addHandler('#'+intent, handler);
    }

    /**
     * @param {string} intent 条件，可以是意图名(加'#'开头)，LaunchRequest，SessionEndedRequest
     * @param {Function} handler 条件处理函数
     *
     * @return {Bot} 返回自己
     * @private
     */
    _addHandler(intent, handler) {
        this._intentHandler.set(intent, () => {
            return handler.call(this); 
        });
        return this;
    }

    /**
     * 对一个事件添加处理函数。比如设备端反馈的音频播放开始事件
     *
     * @example
     * this.addEventListener('Audio', (event)=>{
     *     // event 为事件数据 
     *     // 具体数据结构参考[TODO]
     * });
     *
     * @param {string} event  事件名
     * @param {Function} handler 事件处理函数。返回值非null，将作为bot的response返回DuerOS
     *                        函数返回值参考Response.build() 的输入参数
     * @return {Bot} 返回自己
     * @public
     */
    addEventListener(event, handler) {
        this._eventHandler.set(event, (args) => {
            return handler.call(this, args); 
        });
        return this;
    }

    /**
     * 初始化认证校验
     *
     * @example
     * this.initCertificate(
     *      {signature: '###', signaturecerturl: ''},
     *      '{"version":""}'
     *  );
     *
     * @param {Object} headers http请求的header
     * @param {string} body 请求体
     * @return {Certificate} Certificate实例
     * @public
     */
    initCertificate(headers, body) {
        return this.certificate = new Certificate(headers, body);
    }

    /**
     * 获取DuerOS请求中的意图名
     *
     * @return {string|null}
     * @public
     */
    getIntentName() {
        if (this.nlu) {
            return this.nlu.getIntentName();
        }
    }

    /**
     * 获取session的一个字段对应的值
     *
     * @param {string} field 字段名
     * @param {Mixed} defaultValue  默认值  当此字段没有值时，返回defaultValue
     * @return {Mixied}
     * @public
     */
    getSessionAttribute(field = null, defaultValue = null) {
        return this.session.getData(field, defaultValue);
    }

    /**
     * 设置session的一个字段的值
     *
     * @param {string} field 字段名
     * @param {Mixed} value 字段对应的值
     * @param {Mixed} defaultValue  默认值  当value为空时，使用defaultValue
     * @return {null}
     * @public
     */

    setSessionAttribute(field, value, defaultValue = null) {
        return this.session.setData(field, value, defaultValue); 
    }

    /**
     * 清空session的所有字段
     *
     * @return {null}
     * @public
     */
    clearSessionAttribute() {
        return this.session.clear(); 
    }

    /**
     * 根据槽位名获取槽位对应的值
     *
     * @param {string} field  槽位名
     * @param {Integer} index 第几个intent，默认第一个
     * @return {string} 
     * @public
     */
    getSlot(field, index = 0) {
        if (this.nlu) {
            return this.nlu.getSlot(field, index);
        }
    }

    /**
     * 设置槽位的值。如果该槽位不存在，新增一个槽位名，并设置对于的值
     *
     * @param {string} field 槽位名
     * @param {string} value 值
     * @param {Integer} index 第几个intent，默认第一个
     * @return {null}
     * @public
     */
    setSlot(field, value, index = 0) {
        if (this.nlu) {
            return this.nlu.setSlot(field, value, index);
        }
    }

    /**
     * 设置多轮继续，等待用户回复
     *
     * @return {null}
     * @public
     */
    waitAnswer() {
        //should_end_session 
        this.response.setShouldEndSession(false);
    }
    
    /**
     * 设置多轮结束，此时bot结束多轮对话
     *
     * @public
     */
    endSession() {
        this.response.setShouldEndSession(true);
    }

    /**
     * 设置私钥
     *
     * @param {string} filename 私钥路径
     * @return {Promise}
     */
    setPrivateKey(filename) {
        return new Promise(function(resolve, reject){
            if(!filename) {
                reject(); 
            }

            if(privateKey) {
                resolve(privateKey); 
            }else{
                fs.readFile(filename, {encoding: "utf8"}, (err, data) => {
                    if (err) {
                        console.error('get private key error');
                        reject(); 
                    } else {
                        privateKey = data;
                        resolve(data); 
                    }
                });
            }
        });
    }

    /**
     * bot执行的入口
     *
     * @param {boolean} build 是否需要打包response，输出JSON String
     * @return {Promise}
     * @public
     */
    run(build = true) {
        var _this = this;
        if(this.certificate && this.certificate.enableVerifyRequestSign()) {
            return _this.certificate.verifyRequest().then(function(){
                return _this._run(build); 
            }, function(){
                return _this.response.illegalRequest(); 
            }); 
        }

        return this._run(build); 
    }

    /**
     * @param {boolean} build 是否需要打包response，输出JSON String
     * @return {Promise|string}
     * @private
     */
    _run(build = true) {
        //handler event
        let eventHandler = this._getRegisterEventHandler();

        if (this.request.getType() == 'IntentRequset' && !this.nlu && !eventHandler) {
            return this.response.defaultResult(); 
        }

        //intercept beforeHandler
        let ret;

        //event process
        if (eventHandler) {
            this.botMonitor.setDeviceEventStart();
            let event = this.request.getEventData();
            ret = eventHandler(event);
            this.botMonitor.setDeviceEventEnd();
        } else {
            this.botMonitor.setEventStart();
            ret = this._intentDispatch();
            this.botMonitor.setEventEnd();
        }

        let res = this.response.build(ret);
        var _this = this;
        res.then(function (responseData) {
            _this.botMonitor.setResponseData(responseData);
            _this.botMonitor.uploadData();
        });

        if (!build) {
            return ret; 
        }
        return res;
    }

    /**
     * @return {Object}
     * @private
     */
    _intentDispatch() {
        if (!this._intentHandler.size) {
            return; 
        }

        let rules = this._intentHandler.keys();
        for (let rule of rules) {

            if (this._checkHandler(rule)) {
                let ret = this._intentHandler.get(rule)();
                
                if (ret) {
                    return ret;
                }
            }
        }
    }

    _getRegisterEventHandler() {
        let eventData = this.request.getEventData() || {}; 
        if (eventData.type) {
            let key = eventData.type; 
            return this._eventHandler.get(key); 
        }
    }

    /**
     * @param {string} rule 判断条件
     * @return {boolean}
     * @private
     */
    _checkHandler(rule) {
        let token = this._getToken(rule);
        if (!token instanceof Array) {
            return false; 
        }

        let arr = []; 
        for (let t of token) {
            if (t.type == 'str') {
                arr.push(t.value); 
            } else {
                arr.push(this._tokenValue(t.value)); 
            }
        }
        
        let str = arr.join('');
        let func = new Function('', 'return ' +  str + ';');
        return func();
    }

    /**
     * @param {string} ruleString 判断条件
     * @return {Array}
     * @private
     */
    _getToken(ruleString) {
        function tokenize(token, rule) {
            if (rule === '' || rule === null) {
                return token; 
            }

            token = token || [];
            let rgCom = /[^"']*/;
            let m = rgCom.exec(rule);
            token.push({
                type: 'no_str',
                value: m[0]
            });

            let last = rule.substring(m[0].length);
            if (last !== '' || last !== null) {
                for (let i = 1; i < last.length; i++) {
                    let c = last[i];
                    if (c == '\\'){
                        ++i;
                        continue;
                    }

                    if (c == last[0]) {
                        let s = last.substr(0, i + 1);
                        last = last.substring(s.length);
                        token.push({
                            type: 'str',
                            value: s,
                        });

                        break;
                    }
                }
            }

            if (last) {
                return tokenize(token, last);
            }

            return token;
        }

        let token = [];
        return tokenize(token, ruleString);
    }

    /**
     * @param {string} str 字符串片段
     * @return {string}
     * @private
     */
    _tokenValue (str) {
        if (str === '' || str === null) {
            return ''; 
        }

        let rg = new Map([
                ['intent', /#([\w\.\d_]+)/],
                ['session', /session\.([\w\.\d_]+)/],
                ['slot', /slot\.([\w\d_]+)/],
                ['requestType', /^(LaunchRequest|SessionEndedRequest)$/]
            ]);

        let self = this;
        for(let [k, r] of rg) {
            str = str.replace(r, function() {
                let m = arguments[1];

                if (k == 'intent') {
                    return (self.getIntentName() == m).toString();
                } else if (k == 'session') {
                    return '"' + (self.getSessionAttribute(m)).toString() + '"';
                } else if (k == 'slot') {
                    return '"' + (self.getSlot(m)).toString() + '"';
                } else if (k == 'requestType') {
                    return (self.request.getType() == m).toString();
                }
            });
        }

        return str;  
    }
}

/**
 * Bot可以返回的卡片
 * @namespace Bot.Card
 */
Bot.Card = {};

/**
 * @static
 * @public
 * @see {@link TextCard}
 */
Bot.Card.TextCard = require('./card/TextCard');

/**
 * @static
 * @public
 * @see {@link ImageCard}
 */
Bot.Card.ImageCard = require('./card/ImageCard');

/**
 * @static
 * @public
 * @see {@link StandardCard}
 */
Bot.Card.StandardCard = require('./card/StandardCard');

/**
 * @static
 * @public
 * @see {@link ListCard}
 */
Bot.Card.ListCard = require('./card/ListCard');

/**
 * Bot 可以返回指令
 * @namespace Bot.Directive
 */
Bot.Directive = {};

/**
 * 音频指令
 * @namespace Bot.Directive.AudioPlayer
 */
Bot.Directive.AudioPlayer = {};

/**
 * 音频播放指令
 *
 * @static
 * @public
 * @see {@link Play}
 */
Bot.Directive.AudioPlayer.Play = require('./directive/AudioPlayer/Play.js');

/**
 * 音频停止指令
 *
 * @static
 * @public
 * @see {@link Stop}
 */
Bot.Directive.AudioPlayer.Stop = require('./directive/AudioPlayer/Stop.js');

module.exports = Bot;
