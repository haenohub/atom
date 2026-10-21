const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export function warriorAction(kind='basic',combo=0) {
  const guard=['guard','sanctuary','rage'].includes(kind),heavy=['freeze','judgment'].includes(kind);
  return {kind,combo,age:0,impact:guard?.22:heavy?.42:kind==='dash'?.2:kind==='aoe'?.28:.18,duration:guard?.7:heavy?.92:kind==='aoe'?.8:.56,hit:false};
}
export function warriorPose(action,blocking=false) {
  if(!action)return blocking?{x:-.24,y:.15,z:.08,rx:.15,ry:-.75,rz:1.08}:{x:0,y:0,z:0,rx:0,ry:0,rz:0};
  const t=clamp(action.age/action.duration),wind=smooth(action.age/action.impact),strike=smooth((action.age-action.impact)/.12),recover=smooth((t-.62)/.38),hold=1-recover;
  let x=0,y=0,z=0,rx=0,ry=0,rz=0;
  if(['guard','sanctuary','rage'].includes(action.kind)){x=-.22*wind;y=.25*wind;rz=1.2*wind;ry=-.4*wind;}
  else if(['freeze','judgment'].includes(action.kind)){y=.45*wind-.75*strike;z=.12*wind-.28*strike;rx=-1.1*wind+2.3*strike;rz=-.5*wind+.8*strike;}
  else if(action.kind==='dash'){x=-.17*wind;z=.16*wind-.65*strike;rx=.9*wind;ry=-.4*wind;rz=1.2*wind;}
  else{const side=action.combo%2?-1:1;x=(.24*wind-.63*strike)*side;y=.11*wind-.22*strike;z=.12*wind-.29*strike;rx=-.4*wind+.7*strike;ry=(.65*wind-1.5*strike)*side;rz=(-.8*wind+2.05*strike)*side;if(action.kind==='aoe'){ry*=1.5;rz*=1.2;}}
  return {x:x*hold,y:y*hold,z:z*hold,rx:rx*hold,ry:ry*hold,rz:rz*hold};
}
