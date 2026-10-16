const fs=require('node:fs');const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');const assets=path.join(root,'public','assets');
function wav(name,seconds,notes,noise=0){
  const rate=22050,n=Math.floor(rate*seconds),pcm=Buffer.alloc(n*2);
  for(let i=0;i<n;i++){const t=i/rate;let value=0;
    for(const [start,freq,duration,gain] of notes){const d=t-start;if(d>=0&&d<duration){const attack=Math.min(1,d/.012),release=Math.min(1,(duration-d)/.075);value+=Math.sin(2*Math.PI*freq*d)*Math.exp(-d*3/duration)*attack*release*gain;}}
    if(noise)value+=(Math.random()*2-1)*noise*Math.sin(Math.PI*t/seconds)**2;
    pcm.writeInt16LE(Math.round(Math.max(-.65,Math.min(.65,value))*32767),i*2);
  }
  const head=Buffer.alloc(44);head.write('RIFF');head.writeUInt32LE(36+pcm.length,4);head.write('WAVE',8);head.write('fmt ',12);head.writeUInt32LE(16,16);head.writeUInt16LE(1,20);head.writeUInt16LE(1,22);head.writeUInt32LE(rate,24);head.writeUInt32LE(rate*2,28);head.writeUInt16LE(2,32);head.writeUInt16LE(16,34);head.write('data',36);head.writeUInt32LE(pcm.length,40);fs.writeFileSync(path.join(assets,`${name}.wav`),Buffer.concat([head,pcm]));
}
async function main(){
  fs.mkdirSync(path.join(root,'art-source'),{recursive:true});
  for(const name of ['companion-atlas','room']){
    const publicSource=path.join(assets,`${name}.png`);
    const source=fs.existsSync(publicSource)?publicSource:path.join(root,'art-source',`${name}.png`);
    if(fs.existsSync(source)){
      console.log(name,await sharp(source).metadata());
      await sharp(source).resize({width:name==='room'?900:1800,withoutEnlargement:true}).webp({quality:name==='room'?78:88,alphaQuality:95}).toFile(path.join(assets,`${name}.webp`));
      if(source===publicSource)fs.renameSync(source,path.join(root,'art-source',`${name}.png`));
    }
  }
  const icon='<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="45" fill="#2d6655"/><rect x="50" y="31" width="92" height="128" rx="17" fill="#f6ead0" transform="rotate(-9 96 96)"/><path d="M96 60v72M60 96h72" stroke="#d6a74b" stroke-width="17" stroke-linecap="round"/><circle cx="151" cy="42" r="11" fill="#efcb75"/></svg>';
  fs.writeFileSync(path.join(assets,'icon.svg'),icon);await sharp(Buffer.from(icon)).resize(180).png().toFile(path.join(assets,'apple-touch-icon.png'));
  wav('shuffle',.3,[[0,190,.15,.07],[.13,210,.15,.06]],.06);
  wav('deal',.13,[[0,340,.12,.12]],.025);wav('flip',.16,[[0,470,.07,.11],[.07,610,.08,.10]],.012);
  wav('select',.13,[[0,690,.12,.13]]);wav('correct',.65,[[0,523.25,.26,.17],[.12,659.25,.28,.16],[.25,783.99,.38,.16]]);
  wav('wrong',.4,[[0,392,.20,.11],[.15,349.23,.24,.10]]);
  wav('streak',.85,[[0,523.25,.25,.14],[.11,659.25,.28,.14],[.23,783.99,.28,.14],[.38,1046.5,.4,.13]]);
  wav('complete',1.55,[[0,523.25,.4,.14],[.2,659.25,.4,.14],[.4,783.99,.4,.14],[.65,1046.5,.8,.13],[.66,659.25,.8,.08]]);
  const melody=[60,64,67,71,69,67,64,62,60,64,69,67,64,62,59,62,60,64,67,72,71,67,64,62,60,62,64,67,64,62,60,55];
  const notes=melody.map((m,i)=>[i*.8,440*2**((m-69)/12),.95,.10]);
  for(let i=0;i<8;i++){const bass=[48,53,45,55][i%4];notes.push([i*3.2,440*2**((bass-69)/12),2.9,.045]);}
  wav('music',25.6,notes);
  fs.writeFileSync(path.join(root,'art-source','generation-notes.md'),'# 美术与声音来源\n\n角色和小屋背景使用内置 imagegen，基于用户参考图制作。角色统一5列×2行图集，顺序为待机、微笑、眨眼、鼓掌、答对庆祝、安慰、思考、惊喜、通关、哈欠。保留黑发、白衬衫、黑马甲、耳饰。背景为温暖木质小屋、窗景、绿植与空桌面。完整生成提示见 assets-prompts.txt。WebP为PNG的压缩交付版，图集不逐次重新生成，避免形象漂移。\n\n9个WAV由 scripts/prepare-assets.cjs 原创合成（8种反馈音与可选背景音乐），无外部音频、无真人克隆、无运行时音频接口。品牌图标为本项目SVG。\n');
  console.log('Prepared local art and 9 original WAV assets.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
