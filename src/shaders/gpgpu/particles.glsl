uniform float uTimeFF;
uniform sampler2D uBasePosition;
uniform float uDeltaTime;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;


#include ../includes/simplexNoise4d.glsl


void main()
{
  float time = uTimeFF * 0.2;
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture(uParticles, uv);
  vec4 base = texture(uBasePosition, uv);

// Dead
  if(particle.a >= 1.0)
  {
     particle.a = mod(particle.a, 1.0);
     particle.xyz = base.xyz;
  }

// Alive
  else
  {
    //Strength
    float Strength = simplexNoise4d(vec4(base.xyz * 0.2, time + 1.0));
    float influence = (uFlowFieldInfluence - 0.5) * (-2.0);
    Strength = smoothstep(influence, 1.0, Strength);
   // Flow field
   vec3 flowField = vec3(
     simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 0.0, time)),
     simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 1.0, time)),
     simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 2.0, time))
   );
    flowField = normalize(flowField);
    particle.xyz += flowField * uDeltaTime * Strength * uFlowFieldStrength;
        
    // Decay
    particle.a += uDeltaTime * 0.3;
  }

    gl_FragColor = particle;
  
}


