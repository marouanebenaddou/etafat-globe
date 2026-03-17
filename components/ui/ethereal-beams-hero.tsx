"use client"

import type React from "react"
import { forwardRef, useImperativeHandle, useEffect, useRef, useMemo, useState, type FC, type ReactNode } from "react"
import * as THREE from "three"
import { Canvas, useFrame } from "@react-three/fiber"
import { PerspectiveCamera } from "@react-three/drei"
import { ArrowRight, MapPin, Menu, X } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import ThemeToggle from "@/components/ui/theme-toggle"
import { useCountUp } from "@/lib/hooks"

type UniformValue = THREE.IUniform<unknown> | unknown
interface ExtendMaterialConfig {
  header: string; vertexHeader?: string; fragmentHeader?: string
  material?: THREE.MeshPhysicalMaterialParameters & { fog?: boolean }
  uniforms?: Record<string, UniformValue>
  vertex?: Record<string, string>; fragment?: Record<string, string>
}
type ShaderWithDefines = THREE.ShaderLibShader & { defines?: Record<string, string | number | boolean> }

function extendMaterial<T extends THREE.Material = THREE.Material>(
  BaseMaterial: new (params?: THREE.MaterialParameters) => T,
  cfg: ExtendMaterialConfig,
): THREE.ShaderMaterial {
  const physical = THREE.ShaderLib.physical as ShaderWithDefines
  const { vertexShader: baseVert, fragmentShader: baseFrag, uniforms: baseUniforms } = physical
  const baseDefines = physical.defines ?? {}
  const uniforms: Record<string, THREE.IUniform> = THREE.UniformsUtils.clone(baseUniforms)
  const defaults = new BaseMaterial(cfg.material || {}) as T & {
    color?: THREE.Color; roughness?: number; metalness?: number; envMap?: THREE.Texture; envMapIntensity?: number
  }
  if (defaults.color) uniforms.diffuse.value = defaults.color
  if ("roughness" in defaults) uniforms.roughness.value = defaults.roughness
  if ("metalness" in defaults) uniforms.metalness.value = defaults.metalness
  Object.entries(cfg.uniforms ?? {}).forEach(([key, u]) => {
    uniforms[key] = u !== null && typeof u === "object" && "value" in u
      ? (u as THREE.IUniform<unknown>) : ({ value: u } as THREE.IUniform<unknown>)
  })
  let vert = `${cfg.header}\n${cfg.vertexHeader ?? ""}\n${baseVert}`
  let frag = `${cfg.header}\n${cfg.fragmentHeader ?? ""}\n${baseFrag}`
  for (const [inc, code] of Object.entries(cfg.vertex ?? {})) vert = vert.replace(inc, `${inc}\n${code}`)
  for (const [inc, code] of Object.entries(cfg.fragment ?? {})) frag = frag.replace(inc, `${inc}\n${code}`)
  return new THREE.ShaderMaterial({ defines: { ...baseDefines }, uniforms, vertexShader: vert, fragmentShader: frag, lights: true, fog: !!cfg.material?.fog })
}

const CanvasWrapper: FC<{ children: ReactNode }> = ({ children }) => (
  <Canvas dpr={[1, 2]} frameloop="always" className="w-full h-full">{children}</Canvas>
)

const hexToRGB = (hex: string): [number, number, number] => {
  const c = hex.replace("#", "")
  return [parseInt(c.slice(0,2),16)/255, parseInt(c.slice(2,4),16)/255, parseInt(c.slice(4,6),16)/255]
}

const NOISE = `
float random(in vec2 st){return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);}
float noise(in vec2 st){
  vec2 i=floor(st);vec2 f=fract(st);
  float a=random(i);float b=random(i+vec2(1.,0.));float c=random(i+vec2(0.,1.));float d=random(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}
vec4 permute(vec4 x){return mod(((x*34.)+1.)*x,289.);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.-15.)+10.);}
float cnoise(vec3 P){
  vec3 Pi0=floor(P);vec3 Pi1=Pi0+vec3(1.);Pi0=mod(Pi0,289.);Pi1=mod(Pi1,289.);
  vec3 Pf0=fract(P);vec3 Pf1=Pf0-vec3(1.);
  vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);vec4 iy=vec4(Pi0.yy,Pi1.yy);
  vec4 iz0=Pi0.zzzz;vec4 iz1=Pi1.zzzz;
  vec4 ixy=permute(permute(ix)+iy);vec4 ixy0=permute(ixy+iz0);vec4 ixy1=permute(ixy+iz1);
  vec4 gx0=ixy0/7.;vec4 gy0=fract(floor(gx0)/7.)-.5;gx0=fract(gx0);
  vec4 gz0=vec4(.5)-abs(gx0)-abs(gy0);vec4 sz0=step(gz0,vec4(0.));gx0-=sz0*(step(0.,gx0)-.5);gy0-=sz0*(step(0.,gy0)-.5);
  vec4 gx1=ixy1/7.;vec4 gy1=fract(floor(gx1)/7.)-.5;gx1=fract(gx1);
  vec4 gz1=vec4(.5)-abs(gx1)-abs(gy1);vec4 sz1=step(gz1,vec4(0.));gx1-=sz1*(step(0.,gx1)-.5);gy1-=sz1*(step(0.,gy1)-.5);
  vec3 g000=vec3(gx0.x,gy0.x,gz0.x);vec3 g100=vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010=vec3(gx0.z,gy0.z,gz0.z);vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001=vec3(gx1.x,gy1.x,gz1.x);vec3 g101=vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011=vec3(gx1.z,gy1.z,gz1.z);vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
  g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
  vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
  g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;
  float n000=dot(g000,Pf0);float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
  float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
  float n001=dot(g001,vec3(Pf0.xy,Pf1.z));float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
  float n011=dot(g011,vec3(Pf0.x,Pf1.yz));float n111=dot(g111,Pf1);
  vec3 fade_xyz=fade(Pf0);
  vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
  vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);return 2.2*mix(n_yz.x,n_yz.y,fade_xyz.x);
}`

interface BeamsProps {
  beamWidth?: number; beamHeight?: number; beamNumber?: number
  lightColor?: string; bgColor?: string; diffuseColor?: string
  speed?: number; noiseIntensity?: number; scale?: number; rotation?: number
}

function createGeo(n: number, w: number, h: number, sp: number, segs: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(n*(segs+1)*2*3)
  const idx = new Uint32Array(n*segs*2*3)
  const uvs = new Float32Array(n*(segs+1)*2*2)
  let vo=0,io=0,uo=0
  const xBase=-(n*w+(n-1)*sp)/2
  for (let i=0;i<n;i++){
    const xOff=xBase+i*(w+sp); const uvX=Math.random()*300; const uvY=Math.random()*300
    for (let j=0;j<=segs;j++){
      const y=h*(j/segs-.5)
      pos.set([xOff,y,0,xOff+w,y,0],vo*3); uvs.set([uvX,j/segs+uvY,uvX+1,j/segs+uvY],uo)
      if(j<segs){const a=vo,b=vo+1,c=vo+2,d=vo+3;idx.set([a,b,c,c,b,d],io);io+=6}
      vo+=2;uo+=4
    }
  }
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3))
  geo.setAttribute("uv",new THREE.BufferAttribute(uvs,2))
  geo.setIndex(new THREE.BufferAttribute(idx,1))
  geo.computeVertexNormals(); return geo
}

const MergedPlanes = forwardRef<THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>,
  {material:THREE.ShaderMaterial;width:number;count:number;height:number}>(
  ({material,width,count,height},ref)=>{
    const mesh=useRef<THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>>(null!)
    useImperativeHandle(ref,()=>mesh.current)
    const geo=useMemo(()=>createGeo(count,width,height,0,100),[count,width,height])
    useFrame((_,dt)=>{mesh.current.material.uniforms.time.value+=0.1*dt})
    return <mesh ref={mesh} geometry={geo} material={material}/>
  }
)
MergedPlanes.displayName="MergedPlanes"

const DirLight:FC<{position:[number,number,number];color:string}>=({position,color})=>{
  const dir=useRef<THREE.DirectionalLight>(null!)
  useEffect(()=>{
    if(!dir.current)return
    const cam=dir.current.shadow.camera as THREE.Camera&{top:number;bottom:number;left:number;right:number;far:number}
    cam.top=24;cam.bottom=-24;cam.left=-24;cam.right=24;cam.far=64;dir.current.shadow.bias=-0.004
  },[])
  return <directionalLight ref={dir} color={color} intensity={1} position={position}/>
}

const Beams:FC<BeamsProps>=({
  beamWidth=2,beamHeight=15,beamNumber=12,
  lightColor="#1d6fe8",bgColor="#000510",diffuseColor="#000510",
  speed=2,noiseIntensity=1.75,scale=0.18,rotation=0,
})=>{
  const meshRef=useRef<THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>>(null!)
  const d2r=(d:number)=>(d*Math.PI)/180
  const mat=useMemo(()=>extendMaterial(THREE.MeshStandardMaterial,{
    header:`varying vec3 vEye;varying float vNoise;varying vec2 vUv;varying vec3 vPosition;
uniform float time;uniform float uSpeed;uniform float uNoiseIntensity;uniform float uScale;\n${NOISE}`,
    vertexHeader:`
float getPos(vec3 p){return cnoise(vec3(p.x*0.,p.y-uv.y,p.z+time*uSpeed*3.)*uScale);}
vec3 getCurPos(vec3 p){vec3 n=p;n.z+=getPos(p);return n;}
vec3 getNormal(vec3 p){vec3 c=getCurPos(p);vec3 nx=getCurPos(p+vec3(.01,0,0));vec3 nz=getCurPos(p+vec3(0,-.01,0));
return normalize(cross(normalize(nz-c),normalize(nx-c)));}`,
    fragmentHeader:"",
    vertex:{
      "#include <begin_vertex>":`transformed.z+=getPos(transformed.xyz);`,
      "#include <beginnormal_vertex>":`objectNormal=getNormal(position.xyz);`
    },
    fragment:{
      "#include <dithering_fragment>":`float rn=noise(gl_FragCoord.xy);gl_FragColor.rgb-=rn/15.*uNoiseIntensity;`
    },
    material:{fog:true},
    uniforms:{
      diffuse:new THREE.Color(...hexToRGB(diffuseColor)),
      time:{shared:true,mixed:true,linked:true,value:0},
      roughness:0.3,metalness:0.3,
      uSpeed:{shared:true,mixed:true,linked:true,value:speed},
      envMapIntensity:10,uNoiseIntensity:noiseIntensity,uScale:scale,
    },
  }),[speed,noiseIntensity,scale,diffuseColor])

  return (
    <CanvasWrapper>
      <group rotation={[0,0,d2r(rotation)]}>
        <MergedPlanes ref={meshRef} material={mat} count={beamNumber} width={beamWidth} height={beamHeight}/>
        <DirLight color={lightColor} position={[0,3,10]}/>
      </group>
      <ambientLight intensity={0.6}/>
      <color attach="background" args={[bgColor]}/>
      <PerspectiveCamera makeDefault position={[0,0,20]} fov={30}/>
    </CanvasWrapper>
  )
}

// ============================================================================
// HERO STATS — animated count-up mini cards
// ============================================================================
const heroStats = [
  { target: 40, suffix: "+", label: "Années d'expertise" },
  { target: 170, suffix: "",  label: "Experts & ingénieurs" },
  { target: 4,   suffix: "",  label: "Unités métier" },
  { target: 8,   suffix: "+", label: "Pays d'intervention" },
]

function HeroStatCard({ stat, isDark }: { stat: typeof heroStats[0]; isDark: boolean }) {
  const count = useCountUp(stat.target, 2000, true)
  return (
    <div className="text-center glass rounded-2xl p-5">
      <div
        className={`font-black mb-1 transition-colors duration-500 ${isDark ? "text-white" : "text-slate-900"}`}
        style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
      >
        {count}{stat.suffix}
      </div>
      <div className={`text-xs transition-colors duration-500 ${isDark ? "text-white/50" : "text-slate-500"}`}>
        {stat.label}
      </div>
    </div>
  )
}

function HeroStats({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
      style={{ animation: "fade-up 0.7s ease 1s both" }}
    >
      {heroStats.map(s => (
        <HeroStatCard key={s.label} stat={s} isDark={isDark} />
      ))}
    </div>
  )
}

// ============================================================================
// HERO SECTION
// ============================================================================
export default function EtherealBeamsHero() {
  const { isDark } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setNavHidden(y > 80 && y > lastScrollY.current)
      lastScrollY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  const beamCfg = isDark
    ? { bgColor:"#000510", diffuseColor:"#000510", lightColor:"#007BFF" }
    : { bgColor:"#9ec3de", diffuseColor:"#7aaec8", lightColor:"#007BFF" }

  const bgColor = isDark ? "#000510" : "#9ec3de"
  // In light mode, masks use semi-transparent rgba so the globe bleeds through
  const m = isDark ? bgColor : "rgba(158,195,222,"  // prefix for rgba helper

  return (
    <div className="relative min-h-screen w-full overflow-hidden transition-colors duration-500 pt-20"
      style={{ backgroundColor: bgColor }} id="home">

      {/* Globe video background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: isDark ? 0.85 : 0.92 }}
        >
          <source src="/globe.mp4" type="video/mp4"/>
        </video>

        {/* Inward mask — soft vignette, semi-transparent in light mode */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{
          background: isDark
            ? `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, ${bgColor} 100%)`
            : `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 62%, rgba(158,195,222,0.55) 100%)`
        }}/>

        {/* Edge masks — top/sides subtle, bottom solid for section transition */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{
          background: isDark
            ? `linear-gradient(to bottom, ${bgColor} 0%, transparent 18%, transparent 70%, ${bgColor} 100%),
               linear-gradient(to right,  ${bgColor} 0%, transparent 18%, transparent 82%, ${bgColor} 100%)`
            : `linear-gradient(to bottom, rgba(158,195,222,0.65) 0%, transparent 10%, transparent 78%, ${bgColor} 100%),
               linear-gradient(to right,  rgba(158,195,222,0.35) 0%, transparent 12%, transparent 88%, rgba(158,195,222,0.35) 100%)`
        }}/>
      </div>

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 w-full border-b transition-transform duration-300 ease-in-out ${navHidden ? "-translate-y-full" : "translate-y-0"} ${isDark ? "border-white/5 bg-[#000510]/80 backdrop-blur-xl" : "bg-white/90 border-blue-100 shadow-sm backdrop-blur-xl"}`}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <a href="#home" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png"
                alt="Etafat"
                className={`h-12 w-auto object-contain transition-all duration-500 ${isDark ? "brightness-0 invert" : ""}`}
              />
            </a>

            {/* Nav pills */}
            <div className={`hidden lg:flex items-center space-x-1 rounded-full p-1 backdrop-blur-xl border transition-colors duration-500 ${isDark?"bg-white/5 border-white/10":"bg-white/70 border-blue-100 shadow-sm"}`}>
              {["Accueil","Services","Technologies","À Propos","Académie","Contact"].map(item=>(
                <a key={item} href={`#${item.toLowerCase().replace(" ","").replace("à","a")}`}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${isDark?"text-white/80 hover:bg-white/10 hover:text-white":"text-slate-600 hover:bg-[#007BFF]/5 hover:text-[#007BFF]"}`}>
                  {item}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <ThemeToggle/>
              <a href="#contact"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#007BFF] hover:bg-[#00669D] text-white text-sm font-semibold transition-all duration-300 shadow-lg shadow-[#007BFF]/30 hover:scale-105">
                Contactez-nous <ArrowRight className="w-4 h-4"/>
              </a>
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Menu"
                className={`lg:hidden p-2 rounded-full transition-colors duration-200 ${isDark ? "text-white/80 hover:bg-white/10" : "text-slate-700 hover:bg-black/5"}`}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer — slides down from top */}
        <div
          className={`absolute top-0 left-0 right-0 transition-transform duration-300 ease-out ${mobileOpen ? "translate-y-0" : "-translate-y-full"} ${isDark ? "bg-[#000510]/95 border-b border-white/10" : "bg-white/95 border-b border-blue-100"} backdrop-blur-2xl`}
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-6 h-20">
            <a href="#home" onClick={() => setMobileOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://etafat.ma/wp-content/themes/etafat/assets/images/logo.png"
                alt="Etafat"
                className={`h-10 w-auto object-contain ${isDark ? "brightness-0 invert" : ""}`}
              />
            </a>
            <button
              onClick={() => setMobileOpen(false)}
              className={`p-2 rounded-full ${isDark ? "text-white/80 hover:bg-white/10" : "text-slate-700 hover:bg-black/5"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="px-6 pb-6 flex flex-col gap-1">
            {[
              { label: "Accueil",      href: "#home" },
              { label: "Services",     href: "#services" },
              { label: "Technologies", href: "#technologies" },
              { label: "À Propos",     href: "#apropos" },
              { label: "Académie",     href: "#academie" },
              { label: "Contact",      href: "#contact" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center rounded-2xl px-5 py-4 text-base font-medium transition-all duration-200 ${isDark ? "text-white/80 hover:bg-white/8 hover:text-white" : "text-slate-700 hover:bg-[#007BFF]/5 hover:text-[#007BFF]"}`}
              >
                {label}
              </a>
            ))}

            {/* CTA */}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-[#007BFF] hover:bg-[#00669D] text-white text-base font-semibold transition-all duration-300 shadow-lg shadow-[#007BFF]/30"
            >
              Contactez-nous <ArrowRight className="w-4 h-4" />
            </a>
          </nav>
        </div>
      </div>

      {/* HERO CONTENT */}
      <div className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
          <div className="mx-auto max-w-4xl text-center">

            <div className={`mb-8 inline-flex items-center gap-2 rounded-full backdrop-blur-xl border px-5 py-2 text-sm transition-colors duration-500 ${isDark?"bg-[#007BFF]/10 border-[#007BFF]/20 text-[#4da6ff]":"bg-white/80 border-[#007BFF]/30 text-[#007BFF] shadow-sm"}`}
              style={{animation:"fade-up 0.6s ease 0.2s both"}}>
              <MapPin className="w-4 h-4"/> Maroc &amp; Afrique — Depuis 1983
            </div>

            <h1 className="mb-6 text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl leading-none text-white"
              style={{animation:"fade-up 0.7s ease 0.4s both"}}>
              Révélons le{" "}
              <span style={{background:"linear-gradient(135deg,#007BFF,#00669D)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>potentiel</span>
              <br/>de vos{" "}
              <span className="relative inline-block">
                <span style={{background:"linear-gradient(135deg,#007BFF,#00669D)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>territoires</span>
                <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full" style={{background:"linear-gradient(90deg,#007BFF,#00669D)"}}/>
              </span>
            </h1>

            <p className="mb-12 text-lg leading-8 sm:text-xl max-w-3xl mx-auto text-white/80 transition-colors duration-500"
              style={{animation:"fade-up 0.7s ease 0.6s both"}}>
              Leader en solutions géospatiales, topographie et systèmes d&apos;information géographique.
              Nous transformons les données territoriales en décisions stratégiques.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              style={{animation:"fade-up 0.7s ease 0.8s both"}}>
              <a href="#services"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#007BFF] hover:bg-[#00669D] text-white font-bold text-lg transition-all duration-300 shadow-2xl shadow-[#007BFF]/40 hover:scale-105">
                Découvrir nos solutions <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
              </a>
              <a href="#about"
                className={`inline-flex items-center gap-2 px-8 py-4 rounded-full border font-bold text-lg transition-all duration-300 ${isDark?"border-white/20 bg-white/5 text-white hover:bg-white/10":"border-[#007BFF]/20 bg-white/70 text-[#00669D] hover:bg-white shadow-sm"}`}>
                Notre histoire
              </a>
            </div>

            <HeroStats isDark={isDark} />
          </div>
        </div>
      </div>


    </div>
  )
}
