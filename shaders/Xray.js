V.Xray={
uniforms:{
'env': {type: 't', value: null},
'noiseMat': {type: 't', value: null},
'glowColor': {type: 'c', value: new THREE.Color(0xff0000) },
'opacity': {type: 'f', value: 1.0},
'noise': {type: 'f', value: 0.0},
'useScreen': {type: 'i', value: 0},
'useGlow': {type: 'i', value: 1},
'useGlowColor': {type: 'i', value: 1},
'c': {type: 'f', value: 1.0},
'p': {type: 'f', value: 1.4},
'useRim': {type: 'f', value: 0.0},
'useExtraRim': {type: 'i', value: 0.0},
'rimPower': {type: 'f', value: 0.0},
'noiseProjection': {type: 'f', value: 0.0}
},
fs: [
'uniform sampler2D env;',
'uniform sampler2D noiseMat;',
'uniform vec2 uu;',
'uniform float noise;',
'uniform vec3 glowColor;',
'uniform float opacity;',
'uniform int useGlow;',
'uniform int useGlowColor;',
'uniform float useRim;',
'uniform int useExtraRim;',
'uniform float rimPower;',
'varying float intensity;',
'uniform int useScreen;',
'uniform float noiseProjection;',
'varying vec2 vN;',
'varying vec2 vU;',
'varying vec2 vUv;',
'varying vec3 vEye;',
'varying vec3 vNormal;',
'varying vec3 vPosition;',

'void main() {',
    'float op = opacity;',
    // reflexion map
    'vec3 base = texture2D( env, vN ).rgb;',
    // noise map
    'vec3 bnoise = texture2D( noiseMat, vU ).rgb;',

    'if( useRim > 0. ) {',
        'float f = rimPower * abs( dot( vNormal, normalize( vEye ) ) );',
        'f = useRim * ( 1. - smoothstep( 0.0, 1., f ) );',
        'base += vec3( f );',
    '}',
    'if( useScreen == 1 ) {',
        'base = vec3( 1. ) - ( vec3( 1. ) - base ) * ( vec3( 1. ) - base );',
    '}',
    // noise
    'base += noise * bnoise;',
    'if( useGlowColor == 1 ) {',
        'base *= glowColor;',
    '}',
    // glow color
    'if( useGlow == 1 ) {',
        'base *= intensity;',
    '}',
    // extra Rim
    'if( useExtraRim == 1 ) {',
        'float rim = max( 0., abs( dot( vNormal, -vPosition ) ) );',
        'float r = smoothstep( .25, .75, 1. - rim );',
        'r -= smoothstep( .5, 1., 1. - rim );',
        'vec3 c = vec3( 168. / 255., 205. / 255., 225. / 255. );',
        'base *= c;',
        'op *= r;',
    '}',

    'gl_FragColor = vec4( base, op );',
'}'
].join('\n'),
vs: [
'uniform float c;',
'uniform float p;',
'uniform float useRim;',
'uniform int useGlow;',
'varying vec2 vN;',
'varying vec2 vU;',
'varying vec2 vUv;',
'varying vec3 vEye;',
'varying vec3 vNormal;',
'varying vec3 vPosition;',
'varying float intensity;',
'uniform float noiseProjection;',
'void main() {',
    'vec3 e = normalize( vec3( modelViewMatrix * vec4( position, 1.0 ) ) );',
    'vec3 n = normalize( normalMatrix * normal );',
    'vPosition = e;',
    'vNormal = n;',
    'vec3 g = normalize( vec3( projectionMatrix * modelViewMatrix * vec4( position, 1.0 )));',
    'if( useGlow == 1 ) {',
        'intensity = pow( c - dot(n, g), p );',
    '} else {',
        'intensity = 0.;',
    '}',
    'vec3 r = reflect( e, n );',
    'float m = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );',
    'vN = r.xy / m + .5;',
    'if( noiseProjection == 1. ) {',
        'vU = uv;',
    '} else {',
        //'vU = g.xy;',
        'vU = (e.xy + vec2( 0.8, -0.5 ))/2.;',
    '}',
    'if( useRim > 0. ) {',
        'vEye = ( modelViewMatrix * vec4( position, 1.0 ) ).xyz;',
    '} else {',
        'vEye = vec3( 0. );',
    '}',
    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1. );',
'}'
].join('\n')
}