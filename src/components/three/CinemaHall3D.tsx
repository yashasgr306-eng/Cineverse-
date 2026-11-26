import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ChevronDown, ChevronUp, Eye, Video } from 'lucide-react';
import type { Seat } from '../../types/cinema';
import {
  afterSoftwareDraw,
  applyStudioEnvironment,
  createCinemaRenderer,
  detectSoftwareWebGL,
} from './webglUtils';

export type CameraPreset = 'OVERVIEW' | 'FROM_STAGE' | 'BALCONY' | 'BIRDS_EYE' | 'AUTO_TOUR' | 'SEAT_VIEW';

interface CinemaHall3DProps {
  seats: Seat[];
  selectedSeatIds: number[];
  movieTitle: string;
  moviePosterUrl: string;
  onToggleSeat: (seat: Seat) => void;
  previewSeat: Seat | null;
}

const SEAT_COLORS = {
  AVAILABLE: 0x10b981, // Green
  BOOKED: 0x4b5563, // Grey
  LOCKED: 0xef4444, // Red
  SELECTED: 0xf5c518, // Golden Yellow
};

const CAMERA_PRESETS: Record<
  Exclude<CameraPreset, 'AUTO_TOUR' | 'SEAT_VIEW'>,
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  OVERVIEW: { pos: [0, 7.6, 13.8], target: [0, 1.8, -3.5], label: 'Overview' },
  FROM_STAGE: { pos: [0, 2.2, -5.8], target: [0, 2.2, 5.5], label: 'From Stage' },
  BALCONY: { pos: [0, 7.2, 11.2], target: [0, 2.4, -7.8], label: 'Balcony' },
  BIRDS_EYE: { pos: [0, 16.5, 2.5], target: [0, 0.5, 1.0], label: "Bird's Eye" },
};

export function CinemaHall3D({
  seats,
  selectedSeatIds,
  movieTitle,
  moviePosterUrl,
  onToggleSeat,
  previewSeat,
}: CinemaHall3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const selectedIdsRef = useRef(selectedSeatIds);
  selectedIdsRef.current = selectedSeatIds;
  const onToggleSeatRef = useRef(onToggleSeat);
  onToggleSeatRef.current = onToggleSeat;

  const [preset, setPreset] = useState<CameraPreset>('OVERVIEW');
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  const sceneCtrlRef = useRef({
    targetPos: new THREE.Vector3(...CAMERA_PRESETS.OVERVIEW.pos),
    targetLook: new THREE.Vector3(...CAMERA_PRESETS.OVERVIEW.target),
    autoTour: false,
    transitionActive: false,
    seatPositions: new Map<number, THREE.Vector3>(),
    updateSeatColors: () => {},
    requestRender: () => {},
  });

  const applyCameraPreset = (nextPreset: CameraPreset, targetSeat?: Seat | null) => {
    setPreset(nextPreset);
    const ctrl = sceneCtrlRef.current;

    if (nextPreset === 'AUTO_TOUR') {
      ctrl.autoTour = true;
      ctrl.transitionActive = false;
      ctrl.requestRender();
      return;
    }

    ctrl.autoTour = false;
    ctrl.transitionActive = true;

    if (nextPreset === 'SEAT_VIEW' && targetSeat) {
      const seatPos = ctrl.seatPositions.get(targetSeat.id);
      if (seatPos) {
        ctrl.targetPos.set(seatPos.x, seatPos.y + 1.05, seatPos.z - 0.15);
        ctrl.targetLook.set(0, 2.9, -8.5);
        ctrl.requestRender();
        return;
      }
    }

    const cfg =
      nextPreset === 'SEAT_VIEW'
        ? CAMERA_PRESETS.OVERVIEW
        : CAMERA_PRESETS[nextPreset];
    ctrl.targetPos.set(...cfg.pos);
    ctrl.targetLook.set(...cfg.target);
    ctrl.requestRender();
  };

  // Sync seat color materials whenever seats or selection changes
  useEffect(() => {
    sceneCtrlRef.current.updateSeatColors();
    sceneCtrlRef.current.requestRender();
  }, [seats, selectedSeatIds]);

  // Trigger seat preview camera when parent requests previewSeat
  useEffect(() => {
    if (previewSeat) {
      applyCameraPreset('SEAT_VIEW', previewSeat);
    }
  }, [previewSeat]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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
    container.innerHTML = '';
    container.appendChild(canvas);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.022);

    const disposeEnv = applyStudioEnvironment(renderer, scene, isSoftwareGl);

    const camera = new THREE.PerspectiveCamera(
      48,
      (container.clientWidth || 960) / (container.clientHeight || 540),
      0.1,
      90
    );
    camera.position.set(...CAMERA_PRESETS.OVERVIEW.pos);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...CAMERA_PRESETS.OVERVIEW.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 3.5;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0.15;

    // Cancel scripted camera transition when user grabs OrbitControls
    controls.addEventListener('start', () => {
      sceneCtrlRef.current.autoTour = false;
      sceneCtrlRef.current.transitionActive = false;
    });

    // Lighting: warm auditorium sconces + soft screen wash + hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x111827, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe5a3, 1.4);
    keyLight.position.set(5, 12, 8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -12;
      keyLight.shadow.camera.right = 12;
      keyLight.shadow.camera.top = 12;
      keyLight.shadow.camera.bottom = -12;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const screenLight = new THREE.PointLight(0xfde68a, 1.8, 26);
    screenLight.position.set(0, 4.2, -5.2);
    scene.add(screenLight);

    const disposables: { dispose: () => void }[] = [];

    const initialSeats = seatsRef.current;
    const rowColsMap = new Map<number, number>();
    let maxRowIndex = 8;
    for (const s of initialSeats) {
      rowColsMap.set(s.rowIndex, Math.max(rowColsMap.get(s.rowIndex) ?? 0, s.colNumber));
      if (s.rowIndex > maxRowIndex) maxRowIndex = s.rowIndex;
    }
    const maxColsAcrossRows = Math.max(8, ...Array.from(rowColsMap.values()));
    const hallHalfWidth = Math.max(9.6, (maxColsAcrossRows * 1.06) / 2 + 2.6);
    const floorWidth = hallHalfWidth * 2 + 4.8;
    const hallDepth = Math.max(28, maxRowIndex * 1.5 + 16);
    const hallCenterZ = (maxRowIndex - 8) * 0.65 + 0.5;

    // Auditorium Floor
    const floorGeo = new THREE.PlaneGeometry(floorWidth, hallDepth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d1a,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = hallCenterZ;
    floor.receiveShadow = true;
    scene.add(floor);
    disposables.push(floorGeo, floorMat);

    // Side Acoustic Walls with warm golden vertical light ribs
    const wallGeo = new THREE.BoxGeometry(0.4, 9, hallDepth - 1.5);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0d1324,
      roughness: 0.75,
      metalness: 0.2,
    });
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-hallHalfWidth, 4.5, hallCenterZ);
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(hallHalfWidth, 4.5, hallCenterZ);
    scene.add(leftWall, rightWall);
    disposables.push(wallGeo, wallMat);

    const ribGeo = new THREE.BoxGeometry(0.18, 6.2, 0.22);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0xf5c518,
      emissive: 0xf5c518,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.8,
    });
    for (let z = -6; z <= Math.max(8, -4.2 + maxRowIndex * 1.38 + 1.5); z += 3.5) {
      const lRib = new THREE.Mesh(ribGeo, ribMat);
      lRib.position.set(-(hallHalfWidth - 0.25), 3.6, z);
      const rRib = new THREE.Mesh(ribGeo, ribMat);
      rRib.position.set(hallHalfWidth - 0.25, 3.6, z);
      scene.add(lRib, rRib);
    }
    disposables.push(ribGeo, ribMat);

    // Curved Cinema Screen + Stage Platform + Proscenium Frame
    const stageGeo = new THREE.BoxGeometry(16.5, 0.45, 2.6);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.5,
      metalness: 0.35,
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.set(0, 0.22, -8.5);
    scene.add(stage);

    const screenWidth = 13.8;
    const screenHeight = 5.6;
    const screenGeo = new THREE.PlaneGeometry(screenWidth, screenHeight, 24, 1);
    const posAttr = screenGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const curveZ = (x * x) * 0.018;
      posAttr.setZ(i, curveZ);
    }
    screenGeo.computeVertexNormals();

    // Paint theatrical projection CanvasTexture immediately so screen is never dark/blank
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 1024;
    screenCanvas.height = 448;
    const sCtx = screenCanvas.getContext('2d');
    const paintCinemaScreen = (img?: HTMLImageElement) => {
      if (!sCtx) return;
      const grad = sCtx.createRadialGradient(512, 224, 40, 512, 224, 560);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.55, '#0b1224');
      grad.addColorStop(1, '#050811');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 1024, 448);

      // Subtle golden proscenium glow border
      sCtx.strokeStyle = 'rgba(245, 197, 24, 0.55)';
      sCtx.lineWidth = 4;
      sCtx.strokeRect(14, 14, 996, 420);

      if (img && img.width > 0) {
        // Blurred wide cinematic backdrop fill
        sCtx.save();
        sCtx.globalAlpha = 0.28;
        sCtx.drawImage(img, 0, -120, 1024, 688);
        sCtx.restore();

        // Crisp centered movie frame
        const targetH = 388;
        const targetW = Math.round((img.width / img.height) * targetH);
        const drawX = Math.round((1024 - targetW) / 2);
        sCtx.drawImage(img, drawX, 30, targetW, targetH);

        // Side title plates
        sCtx.fillStyle = '#F5C518';
        sCtx.font = 'bold 20px sans-serif';
        sCtx.textAlign = 'left';
        sCtx.fillText('CINEVERSE IMAX', 48, 210);
        sCtx.fillStyle = '#E2E8F0';
        sCtx.font = 'bold 26px sans-serif';
        sCtx.fillText(movieTitle.toUpperCase(), 48, 246);

        sCtx.textAlign = 'right';
        sCtx.fillStyle = '#F5C518';
        sCtx.font = 'bold 18px monospace';
        sCtx.fillText('DOLBY ATMOS · 4K LASER', 976, 226);
      } else {
        sCtx.fillStyle = '#F5C518';
        sCtx.font = 'bold 24px monospace';
        sCtx.textAlign = 'center';
        sCtx.fillText('CINEVERSE · LASER PROJECTION', 512, 185);
        sCtx.fillStyle = '#FFFFFF';
        sCtx.font = 'bold 54px sans-serif';
        sCtx.fillText(movieTitle.toUpperCase(), 512, 255);
      }
    };
    paintCinemaScreen();

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const posterImg = new Image();
    posterImg.crossOrigin = 'anonymous';
    posterImg.onload = () => {
      paintCinemaScreen(posterImg);
      screenTexture.needsUpdate = true;
      sceneCtrlRef.current.requestRender();
    };
    posterImg.src = moviePosterUrl;

    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissiveMap: screenTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.95,
      roughness: 0.92,
      metalness: 0.0,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 3.55, -8.85);
    scene.add(screenMesh);

    // Golden screen bezel bar
    const bezelGeo = new THREE.BoxGeometry(14.2, 0.14, 0.18);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0xf5c518,
      metalness: 0.9,
      roughness: 0.2,
    });
    const topBezel = new THREE.Mesh(bezelGeo, bezelMat);
    topBezel.position.set(0, 6.42, -8.75);
    const botBezel = new THREE.Mesh(bezelGeo, bezelMat);
    botBezel.position.set(0, 0.68, -8.75);
    scene.add(topBezel, botBezel);

    disposables.push(stageGeo, stageMat, screenGeo, screenTexture, screenMat, bezelGeo, bezelMat);

    // Shared Seat Geometries (Composite 5-part procedural seats!)
    const cushionGeo = new THREE.BoxGeometry(0.68, 0.16, 0.62);
    const backGeo = new THREE.BoxGeometry(0.66, 0.68, 0.15);
    const armrestGeo = new THREE.BoxGeometry(0.1, 0.22, 0.56);
    const pedestalGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.28, 10);
    const reclinerFootGeo = new THREE.BoxGeometry(0.76, 0.12, 0.42);
    const hitProxyGeo = new THREE.BoxGeometry(0.86, 0.95, 0.85);

    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x161f33,
      roughness: 0.45,
      metalness: 0.75,
    });
    const riserMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.15,
    });
    const aisleStripMat = new THREE.MeshBasicMaterial({
      color: 0xf5c518,
      transparent: true,
      opacity: 0.55,
    });

    disposables.push(
      cushionGeo,
      backGeo,
      armrestGeo,
      pedestalGeo,
      reclinerFootGeo,
      hitProxyGeo,
      darkFrameMat,
      riserMat,
      aisleStripMat
    );

    // Material pools per seat state (high performance)
    const seatMaterials = new Map<number, THREE.MeshStandardMaterial>();
    const seatMeshes: THREE.Mesh[] = [];
    const seatPositions = new Map<number, THREE.Vector3>();

    // Group seats by rowIndex to create stepped stadium risers tailored to each row's width
    const rowSet = new Set<number>();

    initialSeats.forEach((seat) => {
      const colsInRow = rowColsMap.get(seat.rowIndex) ?? (seat.category === 'ROYAL_RECLINER' ? 8 : 10);
      const isRecliner = seat.category === 'ROYAL_RECLINER';
      const xSpacing = isRecliner ? 1.25 : 1.02;

      if (!rowSet.has(seat.rowIndex)) {
        rowSet.add(seat.rowIndex);
        const rowZ = -4.2 + seat.rowIndex * 1.38;
        const rowY = seat.rowIndex * 0.34;
        const riserWidth = Math.max(13.2, colsInRow * xSpacing + 3.2);
        const riserGeo = new THREE.BoxGeometry(riserWidth, rowY + 0.16, 1.32);
        const riser = new THREE.Mesh(riserGeo, riserMat);
        riser.position.set(0, (rowY + 0.16) / 2, rowZ);
        riser.receiveShadow = true;
        scene.add(riser);

        // Glowing golden aisle guide strips on center aisle
        const stripGeo = new THREE.BoxGeometry(0.12, 0.03, 1.15);
        const leftStrip = new THREE.Mesh(stripGeo, aisleStripMat);
        leftStrip.position.set(-0.55, rowY + 0.17, rowZ);
        const rightStrip = new THREE.Mesh(stripGeo, aisleStripMat);
        rightStrip.position.set(0.55, rowY + 0.17, rowZ);
        scene.add(leftStrip, rightStrip);
        disposables.push(riserGeo, stripGeo);
      }

      const half = (colsInRow + 1) / 2;
      const aisleGap = seat.colNumber > colsInRow / 2 ? 0.65 : -0.65;
      const x = (seat.colNumber - half) * xSpacing + aisleGap;
      const y = seat.rowIndex * 0.34 + 0.16;
      const z = -4.2 + seat.rowIndex * 1.38;

      const seatGroup = new THREE.Group();
      seatGroup.position.set(x, y, z);
      if (isRecliner) seatGroup.scale.set(1.22, 1.08, 1.18);

      const fabricMat = new THREE.MeshStandardMaterial({
        color: SEAT_COLORS.AVAILABLE,
        roughness: 0.65,
        metalness: 0.12,
      });
      seatMaterials.set(seat.id, fabricMat);
      disposables.push(fabricMat);

      // 1. Pedestal base
      const pedestal = new THREE.Mesh(pedestalGeo, darkFrameMat);
      pedestal.position.set(0, 0.14, 0);
      seatGroup.add(pedestal);

      // 2. Plush Cushion
      const cushion = new THREE.Mesh(cushionGeo, fabricMat);
      cushion.position.set(0, 0.31, 0);
      cushion.castShadow = !isSoftwareGl;
      seatGroup.add(cushion);

      // 3. Angled Backrest
      const backrest = new THREE.Mesh(backGeo, fabricMat);
      backrest.position.set(0, 0.68, 0.25);
      backrest.rotation.x = 0.16;
      backrest.castShadow = !isSoftwareGl;
      seatGroup.add(backrest);

      // 4 & 5. Left & Right Armrests
      const leftArm = new THREE.Mesh(armrestGeo, darkFrameMat);
      leftArm.position.set(-0.36, 0.45, 0.02);
      const rightArm = new THREE.Mesh(armrestGeo, darkFrameMat);
      rightArm.position.set(0.36, 0.45, 0.02);
      seatGroup.add(leftArm, rightArm);

      // 6. Royal Recliner footrest
      if (isRecliner) {
        const foot = new THREE.Mesh(reclinerFootGeo, fabricMat);
        foot.position.set(0, 0.2, -0.45);
        foot.rotation.x = -0.3;
        seatGroup.add(foot);
      }

      // Invisible clickable hit-proxy on Layer 1 for fast raycasting
      const hitProxy = new THREE.Mesh(
        hitProxyGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitProxy.position.set(0, 0.5, 0);
      hitProxy.layers.set(1);
      hitProxy.userData.seatId = seat.id;
      seatGroup.add(hitProxy);

      seatMeshes.push(hitProxy);
      seatPositions.set(seat.id, new THREE.Vector3(x, y, z));
      scene.add(seatGroup);
    });

    sceneCtrlRef.current.seatPositions = seatPositions;

    const updateSeatColors = () => {
      const selectedSet = new Set(selectedIdsRef.current);
      for (const seat of seatsRef.current) {
        const mat = seatMaterials.get(seat.id);
        if (!mat) continue;

        if (selectedSet.has(seat.id)) {
          mat.color.setHex(SEAT_COLORS.SELECTED);
          mat.emissive.setHex(0x6b5300);
          mat.emissiveIntensity = 0.45;
        } else if (seat.status === 'BOOKED') {
          mat.color.setHex(SEAT_COLORS.BOOKED);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        } else if (seat.status === 'LOCKED') {
          mat.color.setHex(SEAT_COLORS.LOCKED);
          mat.emissive.setHex(0x450a0a);
          mat.emissiveIntensity = 0.25;
        } else {
          mat.color.setHex(SEAT_COLORS.AVAILABLE);
          mat.emissive.setHex(0x064e3b);
          mat.emissiveIntensity = 0.15;
        }
      }
    };

    sceneCtrlRef.current.updateSeatColors = updateSeatColors;
    updateSeatColors();

    // Raycaster on Layer 1
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTime = performance.now();
    let tourAngle = 0;

    const drawFrame = () => {
      if (disposed) return;
      renderDirty = false;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const ctrl = sceneCtrlRef.current;

      if (ctrl.autoTour && !isSoftwareGl) {
        tourAngle += dt * 0.35;
        camera.position.set(
          Math.sin(tourAngle) * 11.5,
          5.6 + Math.sin(tourAngle * 0.6) * 1.4,
          Math.cos(tourAngle) * 10.5 + 1.5
        );
        controls.target.set(0, 2.2, -3.5);
      } else if (ctrl.transitionActive) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, ctrl.targetPos.x, 6.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, ctrl.targetPos.y, 6.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, ctrl.targetPos.z, 6.5, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, ctrl.targetLook.x, 6.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, ctrl.targetLook.y, 6.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, ctrl.targetLook.z, 6.5, dt);

        if (
          camera.position.distanceTo(ctrl.targetPos) < 0.04 &&
          controls.target.distanceTo(ctrl.targetLook) < 0.04
        ) {
          ctrl.transitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      const keepAnimating = ctrl.autoTour || ctrl.transitionActive;
      const finish = () => {
        renderBusy = false;
        if (disposed) return;
        if (renderDirty || keepAnimating) {
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

    sceneCtrlRef.current.requestRender = requestRender;
    controls.addEventListener('change', requestRender);
    requestRender();

    // Pointer click & hover detection
    let downX = 0;
    let downY = 0;
    let lastMoveCheck = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return; // Orbit drag, not seat click

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(seatMeshes, false);
      if (hits.length > 0) {
        const seatId = hits[0].object.userData.seatId as number;
        const found = seatsRef.current.find((s) => s.id === seatId);
        if (found) onToggleSeatRef.current(found);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastMoveCheck < 50) return;
      lastMoveCheck = now;

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(seatMeshes, false);
      if (hits.length > 0) {
        const seatId = hits[0].object.userData.seatId as number;
        const found = seatsRef.current.find((s) => s.id === seatId) ?? null;
        setHoveredSeat(found);
        canvas.style.cursor = found && found.status !== 'BOOKED' && found.status !== 'LOCKED' ? 'pointer' : 'not-allowed';
      } else {
        setHoveredSeat(null);
        canvas.style.cursor = 'grab';
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      disposeEnv();
      renderer.dispose();
    };
  }, [moviePosterUrl, seats.length]);

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const firstSelected = selectedSeats[0] ?? null;

  return (
    <div className="relative w-full h-[460px] sm:h-[540px] rounded-2xl overflow-hidden bg-[#050811] border border-white/10">
      {/* Top-Left Minimal Seat Hover Tooltip / Screen Info */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="bg-[#0B1020]/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs">
          <p className="text-slate-300 font-medium">{movieTitle} · 3D Auditorium</p>
          <p className="text-slate-400 mt-0.5">
            {hoveredSeat
              ? `Seat ${hoveredSeat.seatCode} · ${hoveredSeat.category.replace('_', ' ')} · ₹${hoveredSeat.price} (${hoveredSeat.status})`
              : 'Drag to orbit · Scroll to zoom · Click any green seat'}
          </p>
        </div>
      </div>

      {/* 3D Canvas Container */}
      {!webglFailed ? (
        <div ref={mountRef} data-testid="cinema-hall-3d" className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#080D1B]">
          <p className="text-sm text-slate-300">
            3D WebGL viewport unavailable in this browser session. Use the Interactive Seat Map below to select seats.
          </p>
        </div>
      )}

      {/* Collapsible Bottom Camera Control Dock (solid rgba, zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[95%]">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          aria-label={dockCollapsed ? 'Show camera controls' : 'Hide camera controls'}
          className="mb-1.5 px-3 py-1 rounded-t-lg bg-[#0D1426]/95 border border-white/15 text-[11px] font-medium text-slate-300 hover:text-[#F5C518] flex items-center gap-1.5"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {dockCollapsed ? 'Camera Views' : 'Hide Controls'}
        </button>

        {!dockCollapsed && (
          <div className="bg-[#0D1426]/95 border border-white/15 rounded-xl p-1.5 flex flex-wrap items-center justify-center gap-1">
            {(Object.keys(CAMERA_PRESETS) as (keyof typeof CAMERA_PRESETS)[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyCameraPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  preset === key
                    ? 'bg-[#F5C518] text-[#060913]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {CAMERA_PRESETS[key].label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => applyCameraPreset('AUTO_TOUR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                preset === 'AUTO_TOUR'
                  ? 'bg-[#F5C518] text-[#060913]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Auto Tour
            </button>

            <button
              type="button"
              disabled={!firstSelected}
              onClick={() => applyCameraPreset('SEAT_VIEW', firstSelected)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                preset === 'SEAT_VIEW'
                  ? 'bg-[#F5C518] text-[#060913]'
                  : firstSelected
                    ? 'text-[#F5C518] hover:bg-[#F5C518]/15'
                    : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {firstSelected ? `View from ${firstSelected.seatCode}` : 'Select Seat to Preview'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
