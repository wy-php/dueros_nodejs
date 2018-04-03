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


'use strict';

const extend = require('node.extend');

/**
 * 封装DuerOS 对query的解析结果
 * 只有IntentRequest 才有Nlu结构
 **/
class Nlu{

    /**
     * 构造函数
     *
     * @param {array} intents IntentRequest 中的intents
     **/
    constructor (intents) {
        this._data = extend(true, intents);
        this.requestIntents = intents;

        /**
         * 记录返回的指令
         **/
        this._directive = null;
    }

    /**
     * 通过槽位名设置一个槽位的值，如果没有此槽位，新增一个
     *
     * @param {string} field 槽位名
     * @param {string} value 值
     * @param {Integer} index 第几个intent，默认第一个
     * @public
     **/
    setSlot (field, value, index = 0) {
        if (!field || !this._data[index]) {
            return; 
        }

        let slots = this._data[index].slots;
        if(!slots) {
            return; 
        }

        if (slots[field]) {
            slots[field].value = value;
        }

        //add a new field
        slots[field] = {
            name: field,
            value: value
        } 
    }

    /**
     * 通过槽位名获取一个槽位的值
     *
     * @param {string} field 槽位名
     * @param {Integer} index 第几个intent，默认第一个
     * @return {null|string}
     * @public
     **/
    getSlot (field, index = 0) {
        if (!field || !this._data[index]) {
            return; 
        }

        let slots = this._data[index].slots;
        if(!slots || !slots[field]) {
            return; 
        }

        return slots[field].value;
    }

    /**
     * 获取DuerOS请求中的意图名
     *
     * @return {string|null}
     * @public
     **/
    getIntentName () {
        if(this._data[0]) {
            return this._data[0].name;
        }
    }

    /**
     * Bot是否在询问用户，等待用户的回复
     *
     * @return {Boolean}
     **/
    hasAsked () {
        return !!this._directive; 
    }

    /**
     * Bot主动发起对一个槽位的询问。比如：打车时询问用户目的地
     *
     * @example
     * this.ask('destination');
     *
     * @param {string} slot 槽位名
     * @return {null} 
     * @public
     **/
    ask (slot) {
        if (!slot) {
            return; 
        }

        this._directive = {
            type: 'Dialog.ElicitSlot',
            slotToElicit: slot,
            updatedIntent: this._getUpdateIntent()
        };
    }

    /**
     * @return {array}
     **/
    toDirective () {
        return this._directive;
    }

    /**
     * @return {Object}
     **/
    toUpdateIntent () {
        return {
            intent: this._data[0]
        }; 
    }

    /**
     * @return {array}
     * @private
     **/
    _getUpdateIntent () {
        return {
            name: this.getIntentName(),
            slots: this._data[0].slots,
        }; 
    }

    /**
     * 设置将对话的处理代理给Dialog Management(DM)。
     *     按事先配置的顺序，包括对缺失槽位的询问，槽位值的确认（如果设置了槽位需要确认，以及确认的话术）
     *     和整个意图的确认（如果设置了意图需要确认，以及确认的话术。比如可以将收集的槽位依次列出，等待用户确认）
     *
     * @public
     **/
    setDelegate () {
        this._directive = {
            type: 'Dialog.Delegate',
            updatedIntent: this._getUpdateIntent()
        };
    }

    /**
     * 主动发起对一个槽位的确认，此时还需同时返回询问的outputSpeach。
     * 主动发起的确认，DM不会使用默认配置的话术。
     *
     * @example
     * this.setConfirmSlot('destination');
     *
     * @param {string} field 槽位名
     * @public
     **/
    setConfirmSlot (field) {
        let slots = this._data[0].slots; 
        
        if(!slots) {
            return; 
        }
        
        if(slots[field]) {
            this._directive = {
                type: 'Dialog.ConfirmSlot',
                slotToConfirm: field,
                updatedIntent: this._getUpdateIntent()
            }; 
        }
    }

    /**
     * 主动发起对一个意图的确认，此时还需同时返回询问的outputSpeach。
     * 主动发起的确认，DM不会使用默认配置的话术。
     * 一般当槽位填槽完毕，在进行下一步操作之前，一次性的询问各个槽位，是否符合用户预期。 
     *
     * @example
     * this.setConfirmIntent();
     *
     * @public
     **/
    setConfirmIntent () {
        this._directive = {
            type: 'Dialog.ConfirmIntent',
            updatedIntent: this._getUpdateIntent()
        };  
    }

    /**
     * 获取槽位的确认状态
     * @desc 获取一个slot对应的confirmationStatus
     * @param {string} field 槽位名
     * @return {string} 槽位的confirmationStatus
     */
    getSlotConfirmationStatus(field, index = 0) {
        if(!field){
            return;
        }

        let slots = this._data[index].slots;
        return slots[field].confirmationStatus;
    }

     /**
     * 获取意图的确认状态
     * @desc 获取一个intent对应的confirmationStatus
     * @return {string 意图的confirmationStatus
     **/
    getIntentConfirmationStatus(index = 0) {
        return this._data[index].confirmationStatus;
    }
}

Nlu.SLOT_NOT_UNDERSTAND = 'da_system_not_understand';

module.exports = Nlu;
