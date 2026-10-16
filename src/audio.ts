type Sound='shuffle'|'deal'|'flip'|'select'|'correct'|'wrong'|'streak'|'complete';
class AudioManager {
  context:AudioContext|null=null;buffers=new Map<string,AudioBuffer>();loading=new Map<string,Promise<AudioBuffer>>();sound=true;music=false;
  sfx:GainNode|null=null;bg:GainNode|null=null;bgSource:AudioBufferSourceNode|null=null;active=new Set<AudioBufferSourceNode>();
  async unlock(){
    if(!this.context){const Ctor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!Ctor)return;
      this.context=new Ctor();this.sfx=this.context.createGain();this.bg=this.context.createGain();this.sfx.connect(this.context.destination);this.bg.connect(this.context.destination);this.sfx.gain.value=this.sound?.65:0;this.bg.gain.value=this.music?.3:0;
    }
    if(this.context.state==='suspended')await this.context.resume().catch(()=>{});
    if(this.music)void this.startMusic();
  }
  async buffer(name:string){
    if(this.buffers.has(name))return this.buffers.get(name)!;
    if(!this.loading.has(name)){const load=fetch(`${import.meta.env.BASE_URL}assets/${name}.wav`).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.arrayBuffer();}).then(b=>this.context!.decodeAudioData(b)).then(b=>{this.buffers.set(name,b);return b;}).finally(()=>this.loading.delete(name));this.loading.set(name,load);}
    return this.loading.get(name)!;
  }
  set(sound:boolean,music:boolean){this.sound=sound;this.music=music;if(this.sfx)this.sfx.gain.value=sound?.65:0;if(this.bg)this.bg.gain.value=music?.3:0;
    if(!sound){for(const source of this.active){try{source.stop();}catch{/* Already ended. */}}this.active.clear();}
    if(!music&&this.bgSource){this.bgSource.stop();this.bgSource=null;}else if(music&&this.context?.state==='running')void this.startMusic();
  }
  async play(name:Sound){if(!this.sound||!this.context||this.context.state!=='running')return;try{const buffer=await this.buffer(name);if(!this.sound||!this.context||this.context.state!=='running')return;const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.sfx!);this.active.add(source);source.onended=()=>this.active.delete(source);source.start();}catch{/* Text feedback remains available offline if audio decoding fails. */}}
  private startingMusic=false;
  async startMusic(){if(this.bgSource||this.startingMusic||!this.context||!this.music)return;this.startingMusic=true;try{const buffer=await this.buffer('music');if(!this.music||!this.context)return;const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.bg!);this.bgSource=source;source.start();}catch{/* Music is optional. */}finally{this.startingMusic=false;}}
  suspend(){void this.context?.suspend();}
  diagnostics(){return {sound:this.sound,music:this.music,sfxGain:this.sfx?.gain.value??0,musicGain:this.bg?.gain.value??0,activeSfx:this.active.size,musicPlaying:!!this.bgSource};}
}
export const audio=new AudioManager();
