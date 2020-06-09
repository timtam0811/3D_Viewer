// import THREE from "./lib/three.min.js"

class GradShaderMaterial extends THREE.ShaderMaterial{
    constructor(start_color, end_color){
        super({
            uniforms: THREE.UniformsUtils.merge([
                {   color1 : {value:start_color},
                    color2 : {value:end_color},
                    gr_start : {value:50.0},
                    gr_end : {value:250.0},
                    roughness : {value:0.4},
                },
            THREE.UniformsLib.shadowmap,
            THREE.UniformsLib.lights,
            THREE.UniformsLib.ambient
            ]),
            vertexShader:  `
            varying vec3 vViewPosition;
            varying vec3 vNormal;
            varying vec4 vWorldPos;
            varying vec4 vColor;
            attribute vec3 color;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform float gr_start;
            uniform float gr_end;
            void main() {
                vNormal = normalMatrix * normal;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
                vWorldPos = modelMatrix * vec4(position, 1.0);
                // gl_Position = projectionMatrix * viewMatrix * vWorldPos;
                float ratio = (vWorldPos.z < gr_start) ? 0.0 : 
                            ((vWorldPos.z > gr_end) ? 1.0 : 
                            (vWorldPos.z - gr_start)/(gr_end-gr_start));
                vColor=vec4((1.0-ratio)*color1.x + ratio*color2.x,
                            (1.0-ratio)*color1.y + ratio*color2.y,
                            (1.0-ratio)*color1.z + ratio*color2.z,
                            1.0);
            }
             `,
            fragmentShader: `
            varying vec4 vColor;
            // void main(void)
            // {
            //     gl_FragColor = vColor;
            // }
            uniform vec3 diffuse;
            uniform vec3 emissive;

            varying vec3 vViewPosition;
            varying vec3 vNormal;

            #include <common>
            #include <bsdfs>
            #include <lights_pars_begin>

            void main(void) {
            vec3 mvPosition = vViewPosition;
            vec3 transformedNormal = vNormal;

            // ref: https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderChunk/lights_lambert_vertex.glsl.js
            GeometricContext geometry;
            geometry.position = mvPosition.xyz;
            geometry.normal = normalize(transformedNormal);
            geometry.viewDir = (normalize(-mvPosition.xyz));
            vec3 lightFront = vec3(0.0);
            vec3 indirectFront = vec3(0.0);
            IncidentLight directLight;
            float dotNL;
            vec3 directLightColor_Diffuse;
            #if NUM_POINT_LIGHTS > 0
            #pragma unroll_loop
            for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
                getPointDirectLightIrradiance(pointLights[ i ], geometry, directLight);
                dotNL = dot(geometry.normal, directLight.direction);
                directLightColor_Diffuse = PI * directLight.color;
                lightFront += saturate(dotNL) * directLightColor_Diffuse;
                }
            #endif
            #if NUM_SPOT_LIGHTS > 0
            #pragma unroll_loop
            for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
                getSpotDirectLightIrradiance(spotLights[ i ], geometry, directLight);
                dotNL = dot(geometry.normal, directLight.direction);
                directLightColor_Diffuse = PI * directLight.color;
                lightFront += saturate(dotNL) * directLightColor_Diffuse;
            }
            #endif
            #if NUM_DIR_LIGHTS > 0
            #pragma unroll_loop
            for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
                getDirectionalDirectLightIrradiance(directionalLights[ i ], geometry, directLight);
                dotNL = dot(geometry.normal, directLight.direction);
                directLightColor_Diffuse = PI * directLight.color;
                lightFront += saturate(dotNL) * directLightColor_Diffuse;
            }
            #endif
            #if NUM_HEMI_LIGHTS > 0
            #pragma unroll_loop
            for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
                indirectFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
            }
            #endif

            // ref: https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshlambert_frag.glsl.js
            // vec4 diffuseColor = vec4(diffuse, 1.0);
            vec4 diffuseColor = vColor;
            ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
            vec3 totalEmissiveRadiance = emissive;
            reflectedLight.indirectDiffuse = getAmbientLightIrradiance(ambientLightColor);
            reflectedLight.indirectDiffuse += indirectFront;
            reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert(diffuseColor.rgb);
            reflectedLight.directDiffuse = lightFront;
            reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert(diffuseColor.rgb);
            vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
            gl_FragColor = vec4(outgoingLight, diffuseColor.a);
            }
            `,
            lights: true
        });
    }

}