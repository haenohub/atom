const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export function warriorAction(kind='basic',combo=0){
 const guard=['guard','sanctuary','rage'].includes(kind),heavy=['freeze','judgment'].includes(kind);
 return {kind,combo,variant:kind==='basic'?combo%3:kind,age:0,impact:guard?.22:heavy?.42:kind==='dash'?.38:kind==='aoe'?.28:.18,duration:guard?.7:heavy?.92:kind==='dash'?.82:kind==='aoe'?.8:.56,hit:false};
}
export function warriorPose(action,blocking=false){
 const idle={x:0,y:0,z:0,rx:0,ry:0,rz:0,torso:0,lean:0,elbow:0};
 if(!action)return blocking?{...idle,x:-.24,y:.15,z:.08,rx:.15,ry:-.75,rz:1.08}:idle;
 const t=clamp(action.age/action.duration),wind=smooth(action.age/action.impact),strike=smooth((action.age-action.impact)/.12),recover=smooth((t-.65)/.35),hold=1-recover;let x=0,y=0,z=0,rx=0,ry=0,rz=0,torso=0,lean=0,elbow=0;
 if(['guard','sanctuary','rage'].includes(action.kind)){x=-.22*wind;y=.25*wind;rz=1.2*wind;ry=-.4*wind;elbow=.8*wind;}
 else if(['freeze','judgment'].includes(action.kind)){y=.55*wind-.88*strike;z=.16*wind-.43*strike;rx=-1.5*wind+2.9*strike;rz=-.45*wind+.9*strike;lean=-.14*wind+.3*strike;elbow=-.8*wind;}
 else if(action.kind==='dash'){x=-.26*wind;y=-.12*wind;z=.24*wind-.88*strike;rx=.75*wind-.4*strike;ry=-.55*wind;rz=1.2*wind;lean=.28*wind;elbow=-1.15*wind+.9*strike;}
 else if(action.kind==='basic'&&action.combo%3===2){y=.48*wind-.7*strike;z=.15*wind-.5*strike;rx=-1.3*wind+2.5*strike;rz=-.4*wind+.55*strike;lean=-.1*wind+.2*strike;elbow=-.55*wind;}
 else{const side=action.combo%2?-1:1;x=(.32*wind-.88*strike)*side;y=.14*wind-.3*strike;z=.18*wind-.42*strike;rx=-.5*wind+.9*strike;ry=(.85*wind-2.1*strike)*side;rz=(-1.05*wind+2.65*strike)*side;torso=(.5*wind-1.1*strike)*side;elbow=-.4*wind;if(action.kind==='aoe'){ry*=1.4;torso*=1.6;}}
 return {x:x*hold,y:y*hold,z:z*hold,rx:rx*hold,ry:ry*hold,rz:rz*hold,torso:torso*hold,lean:lean*hold,elbow:elbow*hold};
}
export function castAction(kind='orb'){return {kind,age:0,duration:kind==='orb'?.6:kind==='shadowVolley'?.9:1.15};}
export function castingPose(action){
 if(!action)return {raise:0,thrust:0,spread:0};const t=clamp(action.age/action.duration),rise=smooth(t/.38),release=smooth((t-.38)/.22),recover=1-smooth((t-.67)/.33);
 return {raise:rise*recover,thrust:release*recover,spread:Math.sin(t*Math.PI)};
}
