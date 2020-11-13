import dragonBones from './lib/dragonBones.js';
import { Component, director, Game, game, ISchedulable, Node, RenderTexture, Scheduler, systemEvent, SystemEventType } from '../core';
import { ccclass } from '../core/data/class-decorator.js';
import { EDITOR, JSB } from '../../editor/exports/populate-internal-constants.js';
import { CCTextureAtlasData } from './CCTextureData.js';
import { TextureBase } from '../core/assets/texture-base.js';
import { CCSlot } from './CCSlot.js';

/**
 * @module dragonBones
*/

/**
 * DragonBones factory
 * @class CCFactory
 * @extends BaseFactory
*/
@ccclass('dragonBones.CCFactory')
export class CCFactory extends dragonBones.BaseFactory implements ISchedulable {
    /**
     * @method getInstance
     * @return {CCFactory}
     * @static
     * @example
     * let factory = dragonBones.CCFactory.getInstance();
    */
    static _factory: CCFactory | null = null;
    static getInstance () {
        if (!CCFactory._factory) {
            CCFactory._factory = new CCFactory();
        }
        return CCFactory._factory;
    }

    id?: string;
    uuid?: string;

    protected _slots?: CCSlot[];

    constructor () {
        super();
        const eventManager = new CCArmatureDisplay() as dragonBones.ArmatureDisplay;
        this._dragonBones = new dragonBones.DragonBones(eventManager);

        if (!JSB && !EDITOR && director.getScheduler()) {
            game.on(Game.EVENT_RESTART, this.initUpdate, this);
            this.initUpdate();
        }
        this.id = this.uuid = 'dragonBones.CCFactory';
    }

    initUpdate (dt?: number) {
        // director.getScheduler().enableForTarget(this);
        Scheduler.enableForTarget(this);
        director.getScheduler().scheduleUpdate(this, Scheduler.PRIORITY_SYSTEM, false);
    }

    update (dt: number) {
        this._dragonBones.advanceTime(dt);
    }

    getDragonBonesDataByRawData (rawData: any) {
        const dataParser = rawData instanceof ArrayBuffer ? dragonBones.BaseFactory._binaryParser : this._dataParser;
        return dataParser.parseDragonBonesData(rawData, 1.0);
    }

    // Build new aramture with a new display.
    buildArmatureDisplay (armatureName: string, dragonBonesName?: string, skinName?: string, textureAtlasName?: string) {
        const armature = this.buildArmature(armatureName, dragonBonesName, skinName, textureAtlasName);
        return armature ? armature._display : null;
    }

    // Build sub armature from an exist armature component.
    // It will share dragonAsset and dragonAtlasAsset.
    // But node can not share,or will cause render error.
    createArmatureNode (comp: Component, armatureName: string, node?: Node) {
        node = node || new Node();
        let display = node.getComponent('dragonBones.ArmatureDisplay') as ArmatureDisplay;
        if (!display) {
            display = node.addComponent('dragonBones.ArmatureDisplay') as ArmatureDisplay;
        }

        node.name = armatureName;

        display._armatureName = armatureName;
        display._N$dragonAsset = comp.dragonAsset;
        display._N$dragonAtlasAsset = comp.dragonAtlasAsset;
        display._init();

        return display;
    }

    _buildTextureAtlasData (textureAtlasData: null | CCTextureAtlasData, textureAtlas?: RenderTexture | TextureBase) {
        if (textureAtlasData) {
            textureAtlasData.renderTexture = textureAtlas!;
        } else {
            textureAtlasData = dragonBones.BaseObject.borrowObject(CCTextureAtlasData);
        }
        return textureAtlasData;
    }

    _sortSlots () {
        const slots = this._slots!;
        const sortedSlots: CCSlot[] = [];
        for (let i = 0, l = slots.length; i < l; i++) {
            const slot = slots[i];
            const zOrder = slot._zOrder;
            let inserted = false;
            for (let j = sortedSlots.length - 1; j >= 0; j--) {
                if (zOrder >= sortedSlots[j]._zOrder) {
                    sortedSlots.splice(j + 1, 0, slot);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                sortedSlots.splice(0, 0, slot);
            }
        }
        this._slots = sortedSlots;
    }
    _buildArmature (dataPackage) {
        const armature = dragonBones.BaseObject.borrowObject(dragonBones.Armature);

        armature._skinData = dataPackage.skin;
        armature._animation = dragonBones.BaseObject.borrowObject(dragonBones.Animation);
        armature._animation._armature = armature;
        armature._animation.animations = dataPackage.armature.animations;

        armature._isChildArmature = false;

        // fixed dragonbones sort issue
        // armature._sortSlots = this._sortSlots;

        const display = new CCArmatureDisplay();

        armature.init(dataPackage.armature, display, display, this._dragonBones);

        return armature;
    }

    _buildSlot (dataPackage, slotData, displays) {
        const slot = dragonBones.BaseObject.borrowObject(CCSlot);
        const display = slot;
        slot.init(slotData, displays, display, display);
        return slot;
    }

    getDragonBonesDataByUUID (uuid) {
        for (const name in this._dragonBonesDataMap) {
            if (name.indexOf(uuid) !== -1) {
                return this._dragonBonesDataMap[name];
            }
        }
        return null;
    }

    removeDragonBonesDataByUUID (uuid: string, disposeData?: boolean) {
        if (disposeData === undefined) { disposeData = true; }
        for (const name in this._dragonBonesDataMap) {
            if (name.indexOf(uuid) === -1) continue;
            if (disposeData) {
                this._dragonBones.bufferObject(this._dragonBonesDataMap[name]);
            }
            delete this._dragonBonesDataMap[name];
        }
    }
}
