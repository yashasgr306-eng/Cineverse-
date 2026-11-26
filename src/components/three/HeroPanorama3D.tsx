import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';
import type { Movie } from '../../types/cinema';
import {
  afterSoftwareDraw,
  applyStudioEnvironment,
  createCinemaRenderer,
  detectSoftwareWebGL,
} from './webglUtils';

interface HeroPanorama3DProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

interface ScreenCardItem {
  movie: Movie;
  index: number;
  group: THREE.Group;
  frameMat: THREE.MeshStandardMaterial;
  posterMat: THREE.MeshStandardMaterial;
  reflectionMat: THREE.MeshBasicMaterial;
  hitMesh: THREE.Mesh;
}

export function HeroPanorama3D({ movies, onSelectMovie }: HeroPanorama3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelectMovie);
  onSelectRef.current = onSelectMovie;

  const moviesRef = useRef(movies);
  moviesRef.current = movies;

  const [activeIndex, setActiveIndex] = useState(0);
  const [webglFailed, setWebglFailed] = useState(false);

  // Shared mutable state for animation loop without tearing down WebGL
  const controlRef = useRef({
    targetIndex: 0,
    currentAngle: 0,
    targetAngle: 0,
    isDragging: false,
    isHovering: false,
    dragStartX: 0,
    dragStartAngle: 0,
    dragDistance: 0,
    autoRotatePausedUntil: 0,
    requestRender: () => {},
  });

  const activeMovie = movies[activeIndex] ?? movies[0];

  const stepToIndex = (nextIdx: number) => {
    const count = moviesRef.current.length;
    if (count === 0) return;
    const normalized = ((nextIdx % count) + count) % count;
    const stepAngle = (Math.PI * 2) / count;

    // Choose shortest angular path
    const current = controlRef.current.targetAngle;
    const targetMod = -normalized * stepAngle;
    let delta = (targetMod - current) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    controlRef.current.targetAngle = current + delta;
    controlRef.current.targetIndex = normalized;
    controlRef.current.autoRotatePausedUntil = Date.now() + 6500;
    setActiveIndex(normalized);
    controlRef.current.requestRender();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container || movies.length === 0) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createCinemaRenderer(container, isSoftwareGl);
    } catch {
      setWebglFailed(true);
      return;
    }

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'pan-y';
    container.innerHTML = '';
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.045);

    const disposeEnv = applyStudioEnvironment(renderer, scene, isSoftwareGl);

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 1200) / (container.clientHeight || 520),
      0.1,
      100
    );
    camera.position.set(0, 1.05, 12.2);
    camera.lookAt(0, 0.25, 0);

    // Warm/Cool studio lighting contrast
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x060913, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe9b3, 1.85);
    keyLight.position.set(3, 7, 8);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xf5c518, 2.2, 18);
    rimLight.position.set(0, 3.2, 4.5);
    scene.add(rimLight);

    // Deep obsidian stage floor blending seamlessly into #060913
    const floorGeo = new THREE.CircleGeometry(18, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x040710,
      roughness: 0.45,
      metalness: 0.35,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -2.42;
    scene.add(floorMesh);

    // Subtle concentric gold stage arc ring
    const ringGeo = new THREE.RingGeometry(5.65, 5.72, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf5c518,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -2.4;
    scene.add(ringMesh);

    const carouselGroup = new THREE.Group();
    carouselGroup.position.y = 0.22;
    scene.add(carouselGroup);

    const count = movies.length;
    const radius = 6.5;
    const stepAngle = (Math.PI * 2) / count;
    const cardWidth = 2.45;
    const cardHeight = 3.45;

    const frameGeo = new THREE.BoxGeometry(cardWidth + 0.14, cardHeight + 0.14, 0.1);
    const posterGeo = new THREE.PlaneGeometry(cardWidth, cardHeight);
    const reflGeo = new THREE.PlaneGeometry(cardWidth, cardHeight * 0.65);

    const textureLoader = new THREE.TextureLoader();
    const disposables: { dispose: () => void }[] = [
      floorGeo,
      floorMat,
      ringGeo,
      ringMat,
      frameGeo,
      posterGeo,
      reflGeo,
    ];

    const screenItems: ScreenCardItem[] = [];
    const hitMeshes: THREE.Mesh[] = [];

    movies.forEach((movie, index) => {
      const angle = index * stepAngle;
      const itemGroup = new THREE.Group();
      itemGroup.position.set(Math.sin(angle) * radius, 0.1, Math.cos(angle) * radius);
      // Face outward from center so front-most card at z=+radius faces camera (+Z)
      itemGroup.rotation.y = angle;

      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        roughness: 0.28,
        metalness: 0.85,
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.position.z = -0.06;
      itemGroup.add(frameMesh);

      const posterMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.05,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0.05,
      });

      const tex = textureLoader.load(movie.posterUrl, () => {
        controlRef.current.requestRender();
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      posterMat.map = tex;
      posterMat.needsUpdate = true;

      const posterMesh = new THREE.Mesh(posterGeo, posterMat);
      posterMesh.position.z = 0.005;
      posterMesh.userData.movieIndex = index;
      itemGroup.add(posterMesh);

      // Floor reflection plane underneath poster
      const reflMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.16,
        color: 0x94a3b8,
        depthWrite: false,
      });
      const reflMesh = new THREE.Mesh(reflGeo, reflMat);
      reflMesh.scale.y = -1;
      reflMesh.position.set(0, -cardHeight * 0.88, 0.01);
      itemGroup.add(reflMesh);

      disposables.push(frameMat, posterMat, reflMat, tex);
      carouselGroup.add(itemGroup);
      hitMeshes.push(posterMesh);

      screenItems.push({
        movie,
        index,
        group: itemGroup,
        frameMat,
        posterMat,
        reflectionMat: reflMat,
        hitMesh: posterMesh,
      });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const tmpWorldPos = new THREE.Vector3();

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let disposed = false;

    const updateCardsVisuals = () => {
      let closestIdx = 0;
      let maxZ = -Infinity;

      for (const item of screenItems) {
        item.hitMesh.getWorldPosition(tmpWorldPos);
        // Normalize z from [-radius, +radius] -> [0, 1]
        const frontFactor = THREE.MathUtils.clamp((tmpWorldPos.z + radius) / (2 * radius), 0, 1);
        const isFront = frontFactor > 0.92;
        const scale = 0.76 + frontFactor * 0.34;
        item.group.scale.setScalar(scale);

        // Hide far-back cards cleanly so dark frames don't clutter behind the hero screen
        item.group.visible = frontFactor > 0.22;

        // Brightness & golden rim highlight for center screen
        const shade = 0.32 + frontFactor * 0.68;
        item.posterMat.color.setRGB(shade, shade, shade);
        item.reflectionMat.opacity = 0.04 + frontFactor * 0.16;

        if (isFront) {
          item.frameMat.color.setHex(0xf5c518);
          item.frameMat.emissive.setHex(0xf5c518);
          item.frameMat.emissiveIntensity = 0.7;
        } else {
          item.frameMat.color.setHex(0x1f2937);
          item.frameMat.emissive.setHex(0x000000);
          item.frameMat.emissiveIntensity = 0;
        }

        if (tmpWorldPos.z > maxZ) {
          maxZ = tmpWorldPos.z;
          closestIdx = item.index;
        }
      }

      if (closestIdx !== controlRef.current.targetIndex && controlRef.current.isDragging) {
        controlRef.current.targetIndex = closestIdx;
        setActiveIndex(closestIdx);
      }
    };

    const drawFrame = () => {
      if (disposed) return;
      renderDirty = false;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const state = controlRef.current;
      state.currentAngle = THREE.MathUtils.damp(state.currentAngle, state.targetAngle, 8.5, dt);
      carouselGroup.rotation.y = state.currentAngle;
      carouselGroup.updateMatrixWorld(true);
      updateCardsVisuals();

      renderer.render(scene, camera);

      const stillMoving = Math.abs(state.targetAngle - state.currentAngle) > 0.0015;
      const finish = () => {
        renderBusy = false;
        if (disposed) return;
        if (renderDirty || stillMoving) {
          requestRender();
        }
      };

      if (isSoftwareGl) {
        afterSoftwareDraw(renderer, finish, (id) => {
          frameId = id;
        });
      } else {
        finish();
      }
    };

    const requestRender = () => {
      if (disposed || renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(drawFrame);
    };

    controlRef.current.requestRender = requestRender;

    // Initial render
    requestRender();

    // Auto-rotate every 4.8s unless hovering/dragging or reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const autoTimer =
      prefersReducedMotion || isSoftwareGl
        ? null
        : window.setInterval(() => {
            const state = controlRef.current;
            if (state.isDragging || state.isHovering) return;
            if (Date.now() < state.autoRotatePausedUntil) return;
            stepToIndex(state.targetIndex + 1);
          }, 4800);

    // Pointer drag & click raycast
    const onPointerDown = (e: PointerEvent) => {
      controlRef.current.isDragging = true;
      controlRef.current.dragStartX = e.clientX;
      controlRef.current.dragStartAngle = controlRef.current.targetAngle;
      controlRef.current.dragDistance = 0;
      controlRef.current.autoRotatePausedUntil = Date.now() + 8000;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!controlRef.current.isDragging) return;
      const dx = e.clientX - controlRef.current.dragStartX;
      controlRef.current.dragDistance = Math.abs(dx);
      controlRef.current.targetAngle = controlRef.current.dragStartAngle + dx * 0.0055;
      requestRender();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!controlRef.current.isDragging) return;
      controlRef.current.isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }

      if (controlRef.current.dragDistance < 8) {
        // Click detection via raycast
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(hitMeshes, false);
        if (hits.length > 0) {
          const hitIndex = hits[0].object.userData.movieIndex as number;
          if (hitIndex === controlRef.current.targetIndex) {
            const chosen = moviesRef.current[hitIndex];
            if (chosen) onSelectRef.current(chosen);
          } else {
            stepToIndex(hitIndex);
          }
          return;
        }
      }

      // Snap cleanly to nearest movie angle
      const snappedIdx = Math.round(-controlRef.current.targetAngle / stepAngle);
      stepToIndex(snappedIdx);
    };

    const onPointerEnter = () => {
      controlRef.current.isHovering = true;
    };
    const onPointerLeave = () => {
      controlRef.current.isHovering = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (!renderBusy && !disposed) {
        carouselGroup.rotation.y = controlRef.current.currentAngle;
        carouselGroup.updateMatrixWorld(true);
        updateCardsVisuals();
        renderer.render(scene, camera);
      } else {
        requestRender();
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      if (autoTimer) window.clearInterval(autoTimer);
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      disposables.forEach((d) => d.dispose());
      disposeEnv();
      renderer.dispose();
    };
  }, [movies.length]);

  if (!activeMovie) return null;

  return (
    <section
      aria-label="Featured 3D Movie Panorama"
      className="relative w-full overflow-hidden bg-[#060913] border-b border-white/10"
    >
      {/* Top Centered Hero Title */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-2 text-center pointer-events-none">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white">
          CINE<span className="text-[#F5C518]">VERSE</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm font-mono tracking-[0.22em] text-slate-400">
          DRAG TO EXPLORE · TAP A SCREEN TO BOOK
        </p>
      </div>

      {/* 3D WebGL Panorama Stage */}
      <div className="relative w-full h-[390px] sm:h-[440px] md:h-[480px]">
        {!webglFailed ? (
          <div
            ref={mountRef}
            data-testid="hero-3d-panorama"
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />
        ) : (
          /* Graceful 2D fallback if WebGL is disabled */
          <div className="w-full h-full flex items-center justify-center gap-4 px-6 overflow-x-auto">
            {movies.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => (idx === activeIndex ? onSelectMovie(m) : stepToIndex(idx))}
                className={`shrink-0 rounded-xl overflow-hidden border transition-transform ${
                  idx === activeIndex
                    ? 'w-52 h-76 border-[#F5C518] scale-105'
                    : 'w-40 h-60 border-white/10 opacity-60'
                }`}
              >
                <img
                  src={m.posterUrl}
                  alt={m.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Side Navigation Controls */}
        <button
          type="button"
          onClick={() => stepToIndex(activeIndex - 1)}
          aria-label="Previous featured movie"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#0B1020]/90 border border-white/15 text-white hover:border-[#F5C518] hover:text-[#F5C518] flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => stepToIndex(activeIndex + 1)}
          aria-label="Next featured movie"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#0B1020]/90 border border-white/15 text-white hover:border-[#F5C518] hover:text-[#F5C518] flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Active Centered Movie Spotlight Bar (clean margin, zero overlap with reflection) */}
      <div className="relative z-20 max-w-4xl mx-auto px-4 pb-8 mt-3">
        <div className="bg-[#0D1426]/95 border border-white/10 rounded-2xl p-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#F5C518] font-medium">
              <Star className="w-3.5 h-3.5 fill-[#F5C518]" />
              <span className="tabular-nums font-mono">{activeMovie.rating.toFixed(1)}/10</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-slate-300">{activeMovie.language}</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-slate-400 truncate">{activeMovie.genre}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 truncate">
              {activeMovie.title}
            </h2>
            <p className="text-sm text-slate-400 truncate">{activeMovie.tagline}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Carousel index dots */}
            <div className="hidden md:flex items-center gap-1.5 mr-2">
              {movies.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => stepToIndex(idx)}
                  aria-label={`Focus ${m.title}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeIndex ? 'w-6 bg-[#F5C518]' : 'w-2 bg-slate-600 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onSelectMovie(activeMovie)}
              className="px-5 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 fill-[#060913]" />
              Book {activeMovie.title}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
