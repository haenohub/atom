export function turnToward(current,dx,dz,dt,rate=12){if(dx*dx+dz*dz<1e-10||dt<=0)return current;const target=Math.atan2(-dx,-dz),delta=target-current;return current+Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-rate*dt));}
// YXZ retains a full yaw when quaternion interpolation converts back to Euler.
export function applyFacing(group,yaw,roll=0){group.rotation.set(0,yaw,roll,'YXZ');}
