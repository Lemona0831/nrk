'use strict';process.env.DGDIR='06a2';const assert=require('assert/strict'),D=require('./dgqa.js'),E=D.G0,V=D.run_;const plays=[];
class AudioMock {constructor(src){this.src=src;this.handlers={}}cloneNode(){return new AudioMock(this.src)}addEventListener(k,f){this.handlers[k]=f}play(){plays.push(this);if(AudioMock.fail)throw Error('test');return {catch(){}}}}
E.__Audio=AudioMock;V('var Audio=__Audio;SND.unlocked=true;G.data={audio:{on:true,bfx:true,sfx:.7}};SFXB.pre=false');
assert.equal(V("vfxSfxKey({k:'hit',st:'pierce',build:'assassin'})"),'slash');assert.equal(V("vfxSfxKey({k:'hit',st:'blunt',build:'assassin',big:true})"),'slash2');assert.equal(V("vfxSfxKey({k:'hit',st:'blunt',build:'warden',big:true})"),'big');
V("sfxPlay('b_slash',{vol:0})");assert.equal(plays[0].volume,0);plays[0].handlers.ended();
V("SFXB.last={};sfxPlay('b_slash');sfxPlay('b_slash');sfxPlay('b_slash2');sfxPlay('b_big');sfxPlay('b_pierce')");assert.equal(V('SFXB.live'),3);assert.equal(plays.length,4);
plays.slice(1).forEach(a=>a.handlers.ended());assert.equal(V('SFXB.live'),0);
AudioMock.fail=true;V("SFXB.last={};sfxPlay('b_slash')");assert.equal(V('SFXB.live'),0);AudioMock.fail=false;
const n=plays.length;V("G.data.audio.bfx=false;sfxPlay('b_big')");assert.equal(plays.length,n);
console.log('효과음: 암살자 검음·둔기 강타·0 음량·80ms·동시 3개·오류 회수·끄기 통과');
