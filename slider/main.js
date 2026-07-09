import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import jsPDF from 'jspdf';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060607);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(1,2,3);
dir.castShadow = true;
scene.add(dir);

// Additional ambient light for better visibility
const ambient = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambient);

// Camera
const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
camera.position.set(2, 1.5, 2.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Grid & axes
const grid = new THREE.GridHelper(10, 10, 0x3f3f46, 0x27272a);
grid.position.y = -0.0001;
scene.add(grid);
const axes = new THREE.AxesHelper(0.5);
scene.add(axes);

// State
let mesh = null;
let geom = null; // BufferGeometry (merged)
let originalGeom = null; // Store original geometry for reset
let worldBox = new THREE.Box3();
let originalWorldBox = new THREE.Box3(); // Store original bounds for reset
let sliceCount = 0;
let slicePositions = []; // array of plane positions along axis
let currentAxis = 'Z';
let cmPerUnit = 285.3; // default - scales 0.701 OBJ units to 200cm
let panelThicknessCm = 1; // panel thickness in cm
let modelHeightCm = 20; // model height in cm
let modelWidthCm = 15; // model width in cm
let modelDepthCm = 10; // model depth in cm

// Resize state
let currentScale = { x: 1, y: 1, z: 1 }; // Current scale factors
let originalSize = { x: 0, y: 0, z: 0 }; // Original model size in OBJ units

// Block division state
let blockMode = false;
let blockWidthCm = 100; // block width in cm (1m)
let blockHeightCm = 50; // block height in cm (0.5m)
let blockDepthCm = 5; // block depth in cm (5cm)
let blocks = []; // array of block objects with geometry and visibility
let blockCheckboxes = []; // array of checkbox elements
let blockCounts = { x: 0, y: 0, z: 0 }; // number of blocks in each dimension
let wireframesVisible = true; // whether wireframes are currently visible

// LEGO mode state
let legoMode = false;
let legoVoxelWidthCm = 150; // voxel width in cm
let legoVoxelHeightCm = 50; // voxel height in cm
let legoVoxelDepthCm = 5; // voxel depth in cm
let voxels = []; // array of voxel objects with geometry and visibility
let voxelCheckboxes = []; // array of voxel checkbox elements
let voxelCounts = { x: 0, y: 0, z: 0 }; // number of voxels in each dimension
let voxelBordersVisible = true; // whether voxel borders are currently visible

let marginCm = 1.5;
let isClippingEnabled = false;
const eps = 1e-6; // Increased epsilon for better intersection detection
let sliceThumbnailCache = [];
let galleryBuildToken = 0;
let activeSliceIndex = 0;

// UI
const fileInput = document.getElementById('fileInput');
const panelThicknessInput = document.getElementById('panelThicknessCm');
const cmPerUnitInput = document.getElementById('cmPerUnit');
const modelHeightInput = document.getElementById('modelHeightCm');
const modelWidthInput = document.getElementById('modelWidthCm');
const modelDepthInput = document.getElementById('modelDepthCm');
const axisSelect = document.getElementById('axis');
const marginInput = document.getElementById('marginCm');
const slider = document.getElementById('sliceSlider');
const sliceInfo = document.getElementById('sliceInfo');
const prevSliceBtn = document.getElementById('prevSliceBtn');
const nextSliceBtn = document.getElementById('nextSliceBtn');

// Block division UI
const blockWidthInput = document.getElementById('blockWidthCm');
const blockHeightInput = document.getElementById('blockHeightCm');
const blockDepthInput = document.getElementById('blockDepthCm');
const blockInfo = document.getElementById('blockInfo');
const toggleBlockModeBtn = document.getElementById('toggleBlockMode');
const selectAllBlocksBtn = document.getElementById('selectAllBlocks');
const deselectAllBlocksBtn = document.getElementById('deselectAllBlocks');
const toggleWireframesBtn = document.getElementById('toggleWireframes');
const blockCheckboxesSection = document.getElementById('blockCheckboxesSection');
const blockCheckboxesContainer = document.getElementById('blockCheckboxes');

// LEGO mode UI elements
const legoVoxelWidthInput = document.getElementById('legoVoxelWidth');
const legoVoxelHeightInput = document.getElementById('legoVoxelHeight');
const legoVoxelDepthInput = document.getElementById('legoVoxelDepth');
const legoInfo = document.getElementById('legoInfo');
const toggleLegoModeBtn = document.getElementById('toggleLegoMode');
const selectAllVoxelsBtn = document.getElementById('selectAllVoxels');
const deselectAllVoxelsBtn = document.getElementById('deselectAllVoxels');
const toggleVoxelBordersBtn = document.getElementById('toggleVoxelBorders');
const exportLegoDataBtn = document.getElementById('exportLegoData');
const legoVoxelsSection = document.getElementById('legoVoxelsSection');
const legoVoxelsContainer = document.getElementById('legoVoxels');

const panelInfo = document.getElementById('panelInfo');
const exportBtn = document.getElementById('exportBtn');
const extractImgBtn = document.getElementById('extractImgBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadObjBtn = document.getElementById('downloadObjBtn');
const downloadGridImgBtn = document.getElementById('downloadGridImgBtn');
const showInteractiveGridBtn = document.getElementById('showInteractiveGridBtn');
const centerBtn = document.getElementById('centerBtn');
const toggleClippingBtn = document.getElementById('toggleClipping');
const status = document.getElementById('status');
const imagePreviewSection = document.getElementById('imagePreviewSection');
const sliceImage = document.getElementById('sliceImage');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const sliceGallerySection = document.getElementById('sliceGallerySection');
const sliceGalleryGrid = document.getElementById('sliceGalleryGrid');
const sliceGalleryCount = document.getElementById('sliceGalleryCount');
const sliceGalleryLoading = document.getElementById('sliceGalleryLoading');
const sliceGalleryProgress = document.getElementById('sliceGalleryProgress');
const sliceGalleryText = document.getElementById('sliceGalleryText');

// Resize UI elements
const scaleXPercentInput = document.getElementById('scaleXPercent');
const scaleYPercentInput = document.getElementById('scaleYPercent');
const scaleZPercentInput = document.getElementById('scaleZPercent');
const uniformScalePercentInput = document.getElementById('uniformScalePercent');
const targetWidthMInput = document.getElementById('targetWidthM');
const targetHeightMInput = document.getElementById('targetHeightM');
const targetDepthMInput = document.getElementById('targetDepthM');
const applyScaleBtn = document.getElementById('applyScaleBtn');
const applyTargetSizeBtn = document.getElementById('applyTargetSizeBtn');
const resetScaleBtn = document.getElementById('resetScaleBtn');
const currentSizeInfo = document.getElementById('currentSizeInfo');

// Loading elements
const uploadLoading = document.getElementById('uploadLoading');
const uploadProgress = document.getElementById('uploadProgress');
const uploadText = document.getElementById('uploadText');
const exportLoading = document.getElementById('exportLoading');
const exportProgress = document.getElementById('exportProgress');
const exportText = document.getElementById('exportText');

// Clipping plane for preview
let previewPlane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);
renderer.localClippingEnabled = true;
let clipMaterial = new THREE.MeshStandardMaterial({
  color: 0xc4c4cc, 
  metalness: 0.1, 
  roughness: 0.3,
  side: THREE.DoubleSide,
  clippingPlanes: [previewPlane]
});

// Thin ring to show the current plane visually
const planeHelper = new THREE.PlaneHelper(previewPlane, 1.0, 0x34d399);
planeHelper.visible = false;
scene.add(planeHelper);

// Load bundled default model on page initialization
async function loadDefaultModel() {
  try {
    const response = await fetch('./default.obj');
    if (!response.ok) {
      console.log('default.obj not found, skipping auto-load');
      return;
    }

    const text = await response.text();
    processObjText(text, 'output.obj');
  } catch (error) {
    console.log('Could not load default.obj:', error.message);
  }
}

// Process OBJ text (extracted from file input handler)
async function processObjText(text, filename) {
  // Show loading bar
  showLoading(uploadLoading, uploadProgress, uploadText, 'Reading file...');
  updateProgress(uploadProgress, uploadText, 20, 'Reading file...');

  updateProgress(uploadProgress, uploadText, 40, 'Parsing OBJ...');

  const loader = new OBJLoader();
  updateProgress(uploadProgress, uploadText, 60, 'Processing geometry...');

  let obj;
  try {
    obj = loader.parse(text);
    updateProgress(uploadProgress, uploadText, 80, 'Merging meshes...');
  } catch (err) {
    hideLoading(uploadLoading);
    setStatus('Error parsing OBJ: ' + err.message);
    return;
  }

  // Merge meshes to one BufferGeometry in local space
  if (mesh) scene.remove(mesh);
  const group = new THREE.Group();
  obj.traverse((c) => {
    if (c.isMesh) {
      // normalize to non-indexed for easy triangle iteration later
      const g = c.geometry.clone();
      // Only call toNonIndexed if the geometry is indexed
      if (g.index) {
        g.toNonIndexed();
      }
      g.applyMatrix4(c.matrixWorld); // bake transforms
      const m = new THREE.Mesh(g, clipMaterial);
      group.add(m);
    }
  });

  // Merge into single geometry
  const merged = mergeGroupGeometries(group);
  if (!merged) {
    hideLoading(uploadLoading);
    setStatus('No geometry found in OBJ.');
    return;
  }
  
  updateProgress(uploadProgress, uploadText, 90, 'Finalizing...');
  
  geom = merged;
  placeGeometryOnFloor(geom);
  originalGeom = geom.clone(); // Store original geometry for reset
  mesh = new THREE.Mesh(geom, clipMaterial);
  scene.add(mesh);
  
  // Initially show the full object without clipping
  clipMaterial.clippingPlanes = [];

  worldBox.setFromBufferAttribute(geom.getAttribute('position'));
  originalWorldBox.copy(worldBox); // Store original bounds
  fitViewToBox(worldBox);
  
  // Store original size for resize calculations
  const originalSizeVec = new THREE.Vector3();
  worldBox.getSize(originalSizeVec);
  originalSize.x = originalSizeVec.x;
  originalSize.y = originalSizeVec.y;
  originalSize.z = originalSizeVec.z;

  updatePanelInfo();
  computeSlicesFromInputs();
  planeHelper.visible = true;

  exportBtn.disabled = false;
  extractImgBtn.disabled = false;
  downloadAllBtn.disabled = false;
  centerBtn.disabled = false;
  toggleClippingBtn.disabled = false;
  toggleBlockModeBtn.disabled = false;
  toggleWireframesBtn.disabled = false;
  toggleLegoModeBtn.disabled = false;
  toggleVoxelBordersBtn.disabled = false;
  selectAllVoxelsBtn.disabled = false;
  deselectAllVoxelsBtn.disabled = false;
  exportLegoDataBtn.disabled = false;
  applyScaleBtn.disabled = false;
  applyTargetSizeBtn.disabled = false;
  resetScaleBtn.disabled = false;
  downloadObjBtn.disabled = false; // Enable OBJ download button
  downloadGridImgBtn.disabled = false; // Enable grid image download button
  showInteractiveGridBtn.disabled = false; // Enable interactive grid button
  
  // Show slice preview and gallery panels
  imagePreviewSection.style.display = 'block';
  sliceGallerySection.style.display = 'block';
  
  // Calculate and display block information
  calculateBlockDivision();
  
  // Calculate and display voxel information
  calculateVoxelization();
  
  // Update resize UI with current dimensions
  updateResizeUI();

  updateProgress(uploadProgress, uploadText, 100, 'Complete!');
  
  // Hide loading bar after a short delay
  setTimeout(() => {
    hideLoading(uploadLoading);
  }, 500);

  const finalSize = new THREE.Vector3();
  worldBox.getSize(finalSize);
  setStatus(`Model loaded: ${filename}. Size (OBJ units): ${fmt(finalSize.x)} × ${fmt(finalSize.y)} × ${fmt(finalSize.z)}`);
}

// OBJ load
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  let text;
  try {
    text = await file.text();
  } catch (err) {
    setStatus('Error reading file: ' + err.message);
    return;
  }

  await processObjText(text, file.name);
});

panelThicknessInput.addEventListener('input', () => {
  panelThicknessCm = clamp(+panelThicknessInput.value || 1, 0.1, 100);
  updatePanelInfo();
  computeSlicesFromInputs();
  // Reset slider to first position when thickness changes
  selectSlice(0, { updateGalleryHighlight: false });
});
cmPerUnitInput.addEventListener('input', () => {
  cmPerUnit = clamp(+cmPerUnitInput.value || 285.3, 0.001, 100000);
  updatePanelInfo();
  computeSlicesFromInputs();
});
// Note: Model dimension inputs are now informational only
// The actual panel calculation uses the real geometry bounds
modelHeightInput.addEventListener('input', () => {
  modelHeightCm = clamp(+modelHeightInput.value || 20, 0.1, 1000);
  // No need to recalculate panels - they're based on actual geometry
});
modelWidthInput.addEventListener('input', () => {
  modelWidthCm = clamp(+modelWidthInput.value || 15, 0.1, 1000);
  // No need to recalculate panels - they're based on actual geometry
});
modelDepthInput.addEventListener('input', () => {
  modelDepthCm = clamp(+modelDepthInput.value || 10, 0.1, 1000);
  // No need to recalculate panels - they're based on actual geometry
});
axisSelect.addEventListener('change', () => {
  currentAxis = axisSelect.value;
  updatePanelInfo();
  computeSlicesFromInputs();
});
marginInput.addEventListener('input', () => {
  marginCm = clamp(+marginInput.value || 0, 0, 10);
});
slider.addEventListener('input', () => {
  selectSlice(+slider.value, { updateGalleryHighlight: true });
});
exportBtn.addEventListener('click', async () => {
  if (!geom) return;
  exportBtn.disabled = true;
  
  // Show loading bar
  showLoading(exportLoading, exportProgress, exportText, 'Generating slice...');
  updateProgress(exportProgress, exportText, 10, 'Generating slice...');
  
  setStatus('Generating slice PDF…');
  try {
    const currentSliceIndex = parseInt(slider.value);
    const pdfBlob = await sliceToPDF({ 
      geom, 
      axis: currentAxis, 
      cmPerUnit, 
      sliceIndex: currentSliceIndex,
      marginCm,
      onProgress: (percent, message) => {
        updateProgress(exportProgress, exportText, percent, message);
      }
    });
    
    updateProgress(exportProgress, exportText, 95, 'Downloading...');
    downloadBlob(pdfBlob, 'slice.pdf');
    updateProgress(exportProgress, exportText, 100, 'Complete!');
    
    // Hide loading bar after a short delay
    setTimeout(() => {
      hideLoading(exportLoading);
    }, 1000);
    
    setStatus('PDF generated.');
  } catch (e) {
    console.error(e);
    hideLoading(exportLoading);
    setStatus('Failed to generate PDF: ' + e.message);
  } finally {
    exportBtn.disabled = false;
  }
});

extractImgBtn.addEventListener('click', () => {
  if (!geom) return;
  extractImgBtn.disabled = true;

  setStatus('Extracting slice image...');
  try {
    updateSlicePreview(parseInt(slider.value, 10));
    setStatus('Image extracted successfully.');
  } catch (e) {
    console.error(e);
    setStatus('Failed to extract image: ' + e.message);
  } finally {
    extractImgBtn.disabled = false;
  }
});

centerBtn.addEventListener('click', () => {
  if (!geom) return;
  worldBox.setFromBufferAttribute(geom.getAttribute('position'));
  fitViewToBox(worldBox);
});

toggleClippingBtn.addEventListener('click', () => {
  if (!geom) return;
  isClippingEnabled = !isClippingEnabled;
  
  if (isClippingEnabled) {
    clipMaterial.clippingPlanes = [previewPlane];
    planeHelper.visible = true;
    toggleClippingBtn.textContent = 'Show Full Object';
  } else {
    clipMaterial.clippingPlanes = [];
    planeHelper.visible = false;
    toggleClippingBtn.textContent = 'Show Slice Preview';
  }
});

// Block division event listeners
blockWidthInput.addEventListener('input', () => {
  blockWidthCm = clamp(+blockWidthInput.value || 100, 10, 1000);
  if (geom) calculateBlockDivision();
});

blockHeightInput.addEventListener('input', () => {
  blockHeightCm = clamp(+blockHeightInput.value || 50, 10, 1000);
  if (geom) calculateBlockDivision();
});

blockDepthInput.addEventListener('input', () => {
  blockDepthCm = clamp(+blockDepthInput.value || 5, 1, 1000);
  if (geom) calculateBlockDivision();
});

toggleBlockModeBtn.addEventListener('click', () => {
  if (!geom) return;
  blockMode = !blockMode;
  
  if (blockMode) {
    toggleBlockModeBtn.textContent = 'Disable Block Mode';
    blockCheckboxesSection.style.display = 'block';
    selectAllBlocksBtn.disabled = false;
    deselectAllBlocksBtn.disabled = false;
    toggleWireframesBtn.disabled = false;
    createBlockGeometry();
  } else {
    toggleBlockModeBtn.textContent = 'Enable Block Mode';
    blockCheckboxesSection.style.display = 'none';
    selectAllBlocksBtn.disabled = true;
    deselectAllBlocksBtn.disabled = true;
    toggleWireframesBtn.disabled = true;
    // Restore original mesh
    if (mesh) {
      scene.remove(mesh);
      mesh = new THREE.Mesh(geom, clipMaterial);
      scene.add(mesh);
    }
  }
});

selectAllBlocksBtn.addEventListener('click', () => {
  blockCheckboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
  updateBlockVisibility();
});

deselectAllBlocksBtn.addEventListener('click', () => {
  blockCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  updateBlockVisibility();
});

toggleWireframesBtn.addEventListener('click', () => {
  if (!blockMode) return;
  
  wireframesVisible = !wireframesVisible;
  
  // Update all wireframe visibility
  blocks.forEach(block => {
    if (block.wireframe) {
      block.wireframe.visible = wireframesVisible && block.visible;
    }
  });
  
  // Update button text
  toggleWireframesBtn.textContent = wireframesVisible ? 'Hide Wireframes' : 'Show Wireframes';
});

// LEGO mode event listeners
legoVoxelWidthInput.addEventListener('input', () => {
  legoVoxelWidthCm = clamp(+legoVoxelWidthInput.value || 150, 1, 1000);
  if (geom) calculateVoxelization();
});

legoVoxelHeightInput.addEventListener('input', () => {
  legoVoxelHeightCm = clamp(+legoVoxelHeightInput.value || 50, 1, 1000);
  if (geom) calculateVoxelization();
});

legoVoxelDepthInput.addEventListener('input', () => {
  legoVoxelDepthCm = clamp(+legoVoxelDepthInput.value || 5, 1, 1000);
  if (geom) calculateVoxelization();
});

toggleLegoModeBtn.addEventListener('click', () => {
  if (!geom) return;
  legoMode = !legoMode;
  
  if (legoMode) {
    toggleLegoModeBtn.textContent = 'Disable LEGO Mode';
    legoVoxelsSection.style.display = 'block';
    selectAllVoxelsBtn.disabled = false;
    deselectAllVoxelsBtn.disabled = false;
    toggleVoxelBordersBtn.disabled = false;
    exportLegoDataBtn.disabled = false;
    createVoxelGeometry();
  } else {
    toggleLegoModeBtn.textContent = 'Enable LEGO Mode';
    legoVoxelsSection.style.display = 'none';
    selectAllVoxelsBtn.disabled = true;
    deselectAllVoxelsBtn.disabled = true;
    toggleVoxelBordersBtn.disabled = true;
    exportLegoDataBtn.disabled = true;
    // Restore original mesh
    if (mesh) {
      scene.remove(mesh);
      mesh = new THREE.Mesh(geom, clipMaterial);
      scene.add(mesh);
    }
    // Clear voxels
    clearVoxels();
  }
});

selectAllVoxelsBtn.addEventListener('click', () => {
  voxelCheckboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
  updateVoxelVisibility();
});

deselectAllVoxelsBtn.addEventListener('click', () => {
  voxelCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  updateVoxelVisibility();
});

toggleVoxelBordersBtn.addEventListener('click', () => {
  if (!legoMode) return;
  
  voxelBordersVisible = !voxelBordersVisible;
  
  // Update all voxel border visibility
  voxels.forEach(voxel => {
    if (voxel.border) {
      voxel.border.visible = voxelBordersVisible && voxel.visible;
    }
  });
  
  // Update button text
  toggleVoxelBordersBtn.textContent = voxelBordersVisible ? 'Hide Borders' : 'Show Borders';
});

exportLegoDataBtn.addEventListener('click', () => {
  if (!legoMode || voxels.length === 0) return;
  
  const visibleVoxels = voxels.filter(voxel => voxel.visible);
  const legoData = {
    voxelDimensions: {
      width: legoVoxelWidthCm,
      height: legoVoxelHeightCm,
      depth: legoVoxelDepthCm
    },
    voxelCounts: voxelCounts,
    totalVoxels: voxels.length,
    visibleVoxels: visibleVoxels.length,
    voxels: visibleVoxels.map(voxel => ({
      position: voxel.position,
      index: voxel.index
    }))
  };
  
  const dataStr = JSON.stringify(legoData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  downloadBlob(dataBlob, 'lego_voxel_data.json');
  
  setStatus(`Exported ${visibleVoxels.length} voxels to LEGO data file`);
});

// Resize event listeners
uniformScalePercentInput.addEventListener('input', () => {
  const uniformScale = clamp(+uniformScalePercentInput.value || 100, 1, 1000) / 100;
  scaleXPercentInput.value = uniformScale * 100;
  scaleYPercentInput.value = uniformScale * 100;
  scaleZPercentInput.value = uniformScale * 100;
});

applyScaleBtn.addEventListener('click', () => {
  if (!geom) return;
  
  const scaleX = clamp(+scaleXPercentInput.value || 100, 1, 1000) / 100;
  const scaleY = clamp(+scaleYPercentInput.value || 100, 1, 1000) / 100;
  const scaleZ = clamp(+scaleZPercentInput.value || 100, 1, 1000) / 100;
  
  applyResize(scaleX, scaleY, scaleZ);
});

applyTargetSizeBtn.addEventListener('click', () => {
  if (!geom) return;
  
  const targetWidthM = clamp(+targetWidthMInput.value || 1.5, 0.01, 100);
  const targetHeightM = clamp(+targetHeightMInput.value || 2.0, 0.01, 100);
  const targetDepthM = clamp(+targetDepthMInput.value || 1.0, 0.01, 100);
  
  // Convert meters to OBJ units
  const targetWidthUnits = (targetWidthM * 100) / cmPerUnit; // Convert m to cm, then to OBJ units
  const targetHeightUnits = (targetHeightM * 100) / cmPerUnit;
  const targetDepthUnits = (targetDepthM * 100) / cmPerUnit;
  
  // Calculate scale factors
  const scaleX = targetWidthUnits / originalSize.x;
  const scaleY = targetHeightUnits / originalSize.y;
  const scaleZ = targetDepthUnits / originalSize.z;
  
  applyResize(scaleX, scaleY, scaleZ);
});

resetScaleBtn.addEventListener('click', () => {
  if (!originalGeom) return;
  
  // Reset to original geometry
  if (mesh) scene.remove(mesh);
  geom = originalGeom.clone();
  mesh = new THREE.Mesh(geom, clipMaterial);
  scene.add(mesh);
  
  // Reset bounds and scale
  worldBox.copy(originalWorldBox);
  currentScale = { x: 1, y: 1, z: 1 };
  
  // Reset UI
  scaleXPercentInput.value = 100;
  scaleYPercentInput.value = 100;
  scaleZPercentInput.value = 100;
  uniformScalePercentInput.value = 100;
  
  // Update everything
  fitViewToBox(worldBox);
  updateResizeUI();
  updatePanelInfo();
  computeSlicesFromInputs();
  
  // Reset block mode if active
  if (blockMode) {
    calculateBlockDivision();
  }
  
  // Reset LEGO mode if active
  if (legoMode) {
    calculateVoxelization();
  }
  
  setStatus('Model reset to original size');
});

// Resize functions
function applyResize(scaleX, scaleY, scaleZ) {
  if (!geom) return;
  
  // Create scale matrix
  const scaleMatrix = new THREE.Matrix4().makeScale(scaleX, scaleY, scaleZ);
  
  // Apply scale to geometry
  geom.applyMatrix4(scaleMatrix);
  
  // Update current scale
  currentScale.x *= scaleX;
  currentScale.y *= scaleY;
  currentScale.z *= scaleZ;
  
  // Update bounds
  worldBox.setFromBufferAttribute(geom.getAttribute('position'));
  
  // Force geometry update
  geom.attributes.position.needsUpdate = true;
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  geom.computeVertexNormals();
  
  // Update mesh if it exists
  if (mesh) {
    mesh.geometry = geom;
    mesh.updateMatrix();
  }
  
  // Update UI
  updateResizeUI();
  fitViewToBox(worldBox);
  updatePanelInfo();
  computeSlicesFromInputs();
  
  // Update block mode if active
  if (blockMode) {
    calculateBlockDivision();
  }
  
  // Update LEGO mode if active
  if (legoMode) {
    calculateVoxelization();
  }
  
  // Update scale inputs to reflect current scale
  scaleXPercentInput.value = Math.round(currentScale.x * 100);
  scaleYPercentInput.value = Math.round(currentScale.y * 100);
  scaleZPercentInput.value = Math.round(currentScale.z * 100);
  
  setStatus(`Model resized. Scale: ${(currentScale.x * 100).toFixed(1)}% × ${(currentScale.y * 100).toFixed(1)}% × ${(currentScale.z * 100).toFixed(1)}%`);
}

function updateResizeUI() {
  if (!geom) {
    currentSizeInfo.textContent = 'Current size: — | Original size: —';
    return;
  }
  
  const currentSize = new THREE.Vector3();
  worldBox.getSize(currentSize);
  
  const currentSizeCm = {
    x: currentSize.x * cmPerUnit,
    y: currentSize.y * cmPerUnit,
    z: currentSize.z * cmPerUnit
  };
  
  const originalSizeCm = {
    x: originalSize.x * cmPerUnit,
    y: originalSize.y * cmPerUnit,
    z: originalSize.z * cmPerUnit
  };
  
  currentSizeInfo.textContent = `Current: ${currentSizeCm.x.toFixed(1)}×${currentSizeCm.y.toFixed(1)}×${currentSizeCm.z.toFixed(1)} cm | Original: ${originalSizeCm.x.toFixed(1)}×${originalSizeCm.y.toFixed(1)}×${originalSizeCm.z.toFixed(1)} cm`;
  
  // Update target size inputs to current size in meters
  targetWidthMInput.value = (currentSizeCm.x / 100).toFixed(2);
  targetHeightMInput.value = (currentSizeCm.y / 100).toFixed(2);
  targetDepthMInput.value = (currentSizeCm.z / 100).toFixed(2);
}

// Helpers
function setStatus(msg){ status.textContent = msg; }
function fmt(n){ return Number.parseFloat(n).toFixed(3); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// Block division functions
function calculateBlockDivision() {
  if (!geom) return;
  
  // Get model bounds in cm
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const modelSizeCm = {
    x: (box.max.x - box.min.x) * cmPerUnit,
    y: (box.max.y - box.min.y) * cmPerUnit,
    z: (box.max.z - box.min.z) * cmPerUnit
  };
  
  // Calculate number of blocks in each dimension
  blockCounts.x = Math.max(1, Math.ceil(modelSizeCm.x / blockWidthCm));
  blockCounts.y = Math.max(1, Math.ceil(modelSizeCm.y / blockHeightCm));
  blockCounts.z = Math.max(1, Math.ceil(modelSizeCm.z / blockDepthCm));
  
  const totalBlocks = blockCounts.x * blockCounts.y * blockCounts.z;
  
  blockInfo.textContent = `Blocks: ${blockCounts.x}×${blockCounts.y}×${blockCounts.z} | Total: ${totalBlocks}`;
  
  // Update block size inputs to show actual block dimensions
  const actualBlockSizeCm = {
    x: modelSizeCm.x / blockCounts.x,
    y: modelSizeCm.y / blockCounts.y,
    z: modelSizeCm.z / blockCounts.z
  };
  
  setStatus(`Model size: ${modelSizeCm.x.toFixed(1)}×${modelSizeCm.y.toFixed(1)}×${modelSizeCm.z.toFixed(1)} cm | Block size: ${actualBlockSizeCm.x.toFixed(1)}×${actualBlockSizeCm.y.toFixed(1)}×${actualBlockSizeCm.z.toFixed(1)} cm`);
}

function createBlockGeometry() {
  if (!geom) return;
  
  // Clear existing blocks
  blocks.forEach(block => {
    if (block.mesh) scene.remove(block.mesh);
    if (block.wireframe) scene.remove(block.wireframe);
  });
  blocks = [];
  blockCheckboxes = [];
  blockCheckboxesContainer.innerHTML = '';
  
  // Get model bounds
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const modelSizeCm = {
    x: (box.max.x - box.min.x) * cmPerUnit,
    y: (box.max.y - box.min.y) * cmPerUnit,
    z: (box.max.z - box.min.z) * cmPerUnit
  };
  
  // Calculate block size in OBJ units
  const blockSizeUnits = {
    x: blockWidthCm / cmPerUnit,
    y: blockHeightCm / cmPerUnit,
    z: blockDepthCm / cmPerUnit
  };
  
  // Calculate total block size in OBJ units
  const totalBlockSizeUnits = {
    x: blockCounts.x * blockSizeUnits.x,
    y: blockCounts.y * blockSizeUnits.y,
    z: blockCounts.z * blockSizeUnits.z
  };
  
  // Calculate offset to center blocks horizontally but start from top vertically
  const offset = {
    x: (box.max.x - box.min.x - totalBlockSizeUnits.x) / 2,
    y: box.max.y - totalBlockSizeUnits.y, // Start from top (max Y)
    z: (box.max.z - box.min.z - totalBlockSizeUnits.z) / 2
  };

  // Create blocks
  let blockIndex = 0;
  for (let z = 0; z < blockCounts.z; z++) {
    for (let y = 0; y < blockCounts.y; y++) {
      for (let x = 0; x < blockCounts.x; x++) {
        const blockBox = new THREE.Box3(
          new THREE.Vector3(
            box.min.x + offset.x + x * blockSizeUnits.x,
            box.min.y + offset.y + y * blockSizeUnits.y,
            box.min.z + offset.z + z * blockSizeUnits.z
          ),
          new THREE.Vector3(
            box.min.x + offset.x + (x + 1) * blockSizeUnits.x,
            box.min.y + offset.y + (y + 1) * blockSizeUnits.y,
            box.min.z + offset.z + (z + 1) * blockSizeUnits.z
          )
        );
        
        // Extract geometry for this block
        const blockGeom = extractBlockGeometry(geom, blockBox);
        
        if (blockGeom && blockGeom.attributes.position.count > 0) {
          const blockMesh = new THREE.Mesh(blockGeom, clipMaterial);
          blockMesh.visible = true;
          scene.add(blockMesh);
          
          // Create green wireframe box for this block
          const wireframeGeometry = new THREE.BoxGeometry(
            blockBox.max.x - blockBox.min.x,
            blockBox.max.y - blockBox.min.y,
            blockBox.max.z - blockBox.min.z
          );
          const wireframeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x34d399, // Mapshroom accent
            linewidth: 2,
            transparent: true,
            opacity: 0.8
          });
          const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(wireframeGeometry),
            wireframeMaterial
          );
          
          // Position the wireframe at the center of the block
          wireframe.position.copy(blockBox.getCenter(new THREE.Vector3()));
          wireframe.visible = true;
          scene.add(wireframe);
          
          const block = {
            mesh: blockMesh,
            geometry: blockGeom,
            wireframe: wireframe,
            box: blockBox,
            index: blockIndex,
            position: { x, y, z },
            visible: true
          };
          
          blocks.push(block);
          
          // Create checkbox
          createBlockCheckbox(block, x, y, z);
        }
        
        blockIndex++;
      }
    }
  }
  
  // Remove original mesh when in block mode
  if (mesh) {
    scene.remove(mesh);
  }
  
  setStatus(`Created ${blocks.length} blocks`);
}

function extractBlockGeometry(originalGeom, blockBox) {
  const pos = originalGeom.getAttribute('position');
  const V = pos.array;
  const newPositions = [];
  const newNormals = [];
  
  // Process triangles
  for (let i = 0; i < V.length; i += 9) {
    const v0 = new THREE.Vector3(V[i], V[i+1], V[i+2]);
    const v1 = new THREE.Vector3(V[i+3], V[i+4], V[i+5]);
    const v2 = new THREE.Vector3(V[i+6], V[i+7], V[i+8]);
    
    // Check if any vertex is inside the block
    if (blockBox.containsPoint(v0) || blockBox.containsPoint(v1) || blockBox.containsPoint(v2)) {
      // Add all three vertices
      newPositions.push(v0.x, v0.y, v0.z);
      newPositions.push(v1.x, v1.y, v1.z);
      newPositions.push(v2.x, v2.y, v2.z);
    }
  }
  
  if (newPositions.length === 0) return null;
  
  const blockGeom = new THREE.BufferGeometry();
  blockGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3));
  blockGeom.computeBoundingBox();
  blockGeom.computeBoundingSphere();
  blockGeom.computeVertexNormals();
  
  return blockGeom;
}

function createBlockCheckbox(block, x, y, z) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `block-${x}-${y}-${z}`;
  checkbox.checked = true;
  const label = document.createElement('label');
  label.htmlFor = `block-${x}-${y}-${z}`;
  label.textContent = `Block ${block.index + 1} (${x},${y},${z})`;
  
  const container = document.createElement('div');
  container.className = 'checklist-item';
  container.appendChild(checkbox);
  container.appendChild(label);
  
  checkbox.addEventListener('change', () => {
    block.visible = checkbox.checked;
    block.mesh.visible = checkbox.checked;
  });
  
  blockCheckboxes.push(checkbox);
  blockCheckboxesContainer.appendChild(container);
}

function updateBlockVisibility() {
  blocks.forEach((block, index) => {
    if (blockCheckboxes[index]) {
      block.visible = blockCheckboxes[index].checked;
      block.mesh.visible = blockCheckboxes[index].checked;
      // Also control wireframe visibility (respect global wireframe toggle)
      if (block.wireframe) {
        block.wireframe.visible = blockCheckboxes[index].checked && wireframesVisible;
      }
    }
  });
  
  // Update slice info when visibility changes
  if (blockMode) {
    computeSlicesFromInputs();
  }
}

function mergeBlockGeometries(visibleBlocks) {
  if (visibleBlocks.length === 0) return null;
  
  const positions = [];
  visibleBlocks.forEach(block => {
    if (block.geometry && block.geometry.attributes.position) {
      const pos = block.geometry.attributes.position.array;
      positions.push(pos);
    }
  });
  
  if (positions.length === 0) return null;
  
  const totalFloats = positions.reduce((s, a) => s + a.length, 0);
  const merged = new Float32Array(totalFloats);
  let o = 0;
  for (const arr of positions) {
    merged.set(arr, o);
    o += arr.length;
  }
  
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(merged, 3));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  g.computeVertexNormals();
  return g;
}

// LEGO mode functions
function calculateVoxelization() {
  if (!geom) return;
  
  // Get model bounds in cm
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const modelSizeCm = {
    x: (box.max.x - box.min.x) * cmPerUnit,
    y: (box.max.y - box.min.y) * cmPerUnit,
    z: (box.max.z - box.min.z) * cmPerUnit
  };
  
  // Calculate number of voxels in each dimension
  voxelCounts.x = Math.max(1, Math.ceil(modelSizeCm.x / legoVoxelWidthCm));
  voxelCounts.y = Math.max(1, Math.ceil(modelSizeCm.y / legoVoxelHeightCm));
  voxelCounts.z = Math.max(1, Math.ceil(modelSizeCm.z / legoVoxelDepthCm));
  
  const totalVoxels = voxelCounts.x * voxelCounts.y * voxelCounts.z;
  
  legoInfo.textContent = `Voxels: ${voxelCounts.x}×${voxelCounts.y}×${voxelCounts.z} | Total: ${totalVoxels}`;
  
  // Update voxel size inputs to show actual voxel dimensions
  const actualVoxelSizeCm = {
    x: modelSizeCm.x / voxelCounts.x,
    y: modelSizeCm.y / voxelCounts.y,
    z: modelSizeCm.z / voxelCounts.z
  };
  
  setStatus(`Model size: ${modelSizeCm.x.toFixed(1)}×${modelSizeCm.y.toFixed(1)}×${modelSizeCm.z.toFixed(1)} cm | Voxel size: ${actualVoxelSizeCm.x.toFixed(1)}×${actualVoxelSizeCm.y.toFixed(1)}×${actualVoxelSizeCm.z.toFixed(1)} cm`);
}

function createVoxelGeometry() {
  if (!geom) return;
  
  // Clear existing voxels
  clearVoxels();
  
  // Get model bounds
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const modelSizeCm = {
    x: (box.max.x - box.min.x) * cmPerUnit,
    y: (box.max.y - box.min.y) * cmPerUnit,
    z: (box.max.z - box.min.z) * cmPerUnit
  };
  
  // Calculate voxel size in OBJ units
  const voxelSizeUnits = {
    x: legoVoxelWidthCm / cmPerUnit,
    y: legoVoxelHeightCm / cmPerUnit,
    z: legoVoxelDepthCm / cmPerUnit
  };
  
  // Create voxel grid
  const voxelGrid = new Array(voxelCounts.x);
  for (let x = 0; x < voxelCounts.x; x++) {
    voxelGrid[x] = new Array(voxelCounts.y);
    for (let y = 0; y < voxelCounts.y; y++) {
      voxelGrid[x][y] = new Array(voxelCounts.z).fill(false);
    }
  }
  
  // Voxelize the geometry
  voxelizeGeometry(geom, box, voxelSizeUnits, voxelGrid);
  
  // Create voxel meshes for occupied voxels
  let voxelIndex = 0;
  for (let z = 0; z < voxelCounts.z; z++) {
    for (let y = 0; y < voxelCounts.y; y++) {
      for (let x = 0; x < voxelCounts.x; x++) {
        if (voxelGrid[x][y][z]) {
          const voxelBox = new THREE.Box3(
            new THREE.Vector3(
              box.min.x + x * voxelSizeUnits.x,
              box.min.y + y * voxelSizeUnits.y,
              box.min.z + z * voxelSizeUnits.z
            ),
            new THREE.Vector3(
              box.min.x + (x + 1) * voxelSizeUnits.x,
              box.min.y + (y + 1) * voxelSizeUnits.y,
              box.min.z + (z + 1) * voxelSizeUnits.z
            )
          );
          
          // Create cut voxel mesh that follows the statue's shape
          const cutVoxelGeometry = createCutVoxelGeometry(geom, voxelBox);
          
          if (cutVoxelGeometry && cutVoxelGeometry.attributes.position.count > 0) {
            const voxelMaterial = new THREE.MeshStandardMaterial({
              color: 0xff6b35, // Orange color for LEGO blocks
              metalness: 0.1,
              roughness: 0.3
            });
            
            const voxelMesh = new THREE.Mesh(cutVoxelGeometry, voxelMaterial);
            voxelMesh.visible = true;
            scene.add(voxelMesh);
            
            // Create border wireframe for the cut voxel
            const borderGeometry = new THREE.BoxGeometry(
              voxelBox.max.x - voxelBox.min.x,
              voxelBox.max.y - voxelBox.min.y,
              voxelBox.max.z - voxelBox.min.z
            );
            const borderMaterial = new THREE.LineBasicMaterial({ 
              color: 0x000000, // Black borders
              linewidth: 2,
              transparent: true,
              opacity: 0.8
            });
            const border = new THREE.LineSegments(
              new THREE.EdgesGeometry(borderGeometry),
              borderMaterial
            );
            border.position.copy(voxelBox.getCenter(new THREE.Vector3()));
            border.visible = voxelBordersVisible;
            scene.add(border);
            
            const voxel = {
              mesh: voxelMesh,
              border: border,
              box: voxelBox,
              index: voxelIndex,
              position: { x, y, z },
              visible: true
            };
            
            voxels.push(voxel);
            
            // Create checkbox
            createVoxelCheckbox(voxel, x, y, z);
            
            voxelIndex++;
          }
        }
      }
    }
  }
  
  // Remove original mesh when in LEGO mode
  if (mesh) {
    scene.remove(mesh);
  }
  
  setStatus(`Created ${voxels.length} voxels`);
}

function voxelizeGeometry(geometry, boundingBox, voxelSizeUnits, voxelGrid) {
  const pos = geometry.getAttribute('position');
  const V = pos.array;
  
  // Sample points from the geometry and mark occupied voxels
  for (let i = 0; i < V.length; i += 9) {
    const v0 = new THREE.Vector3(V[i], V[i+1], V[i+2]);
    const v1 = new THREE.Vector3(V[i+3], V[i+4], V[i+5]);
    const v2 = new THREE.Vector3(V[i+6], V[i+7], V[i+8]);
    
    // Sample points along the triangle edges
    const samples = [
      v0, v1, v2,
      v0.clone().lerp(v1, 0.5),
      v1.clone().lerp(v2, 0.5),
      v2.clone().lerp(v0, 0.5),
      v0.clone().lerp(v1, 0.25).lerp(v2, 0.25),
      v0.clone().lerp(v1, 0.75).lerp(v2, 0.75)
    ];
    
    for (const point of samples) {
      if (boundingBox.containsPoint(point)) {
        const x = Math.floor((point.x - boundingBox.min.x) / voxelSizeUnits.x);
        const y = Math.floor((point.y - boundingBox.min.y) / voxelSizeUnits.y);
        const z = Math.floor((point.z - boundingBox.min.z) / voxelSizeUnits.z);
        
        if (x >= 0 && x < voxelCounts.x && 
            y >= 0 && y < voxelCounts.y && 
            z >= 0 && z < voxelCounts.z) {
          voxelGrid[x][y][z] = true;
        }
      }
    }
  }
}

function createVoxelCheckbox(voxel, x, y, z) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `voxel-${x}-${y}-${z}`;
  checkbox.checked = true;
  const label = document.createElement('label');
  label.htmlFor = `voxel-${x}-${y}-${z}`;
  label.textContent = `Voxel ${voxel.index + 1} (${x},${y},${z})`;
  
  const container = document.createElement('div');
  container.className = 'checklist-item';
  container.appendChild(checkbox);
  container.appendChild(label);
  
  checkbox.addEventListener('change', () => {
    voxel.visible = checkbox.checked;
    voxel.mesh.visible = checkbox.checked;
    if (voxel.border) {
      voxel.border.visible = checkbox.checked && voxelBordersVisible;
    }
  });
  
  voxelCheckboxes.push(checkbox);
  legoVoxelsContainer.appendChild(container);
}

function updateVoxelVisibility() {
  voxels.forEach((voxel, index) => {
    if (voxelCheckboxes[index]) {
      voxel.visible = voxelCheckboxes[index].checked;
      voxel.mesh.visible = voxelCheckboxes[index].checked;
      if (voxel.border) {
        voxel.border.visible = voxelCheckboxes[index].checked && voxelBordersVisible;
      }
    }
  });
}

function clearVoxels() {
  voxels.forEach(voxel => {
    if (voxel.mesh) scene.remove(voxel.mesh);
    if (voxel.border) scene.remove(voxel.border);
  });
  voxels = [];
  voxelCheckboxes = [];
  legoVoxelsContainer.innerHTML = '';
}

function createCutVoxelGeometry(originalGeom, voxelBox) {
  const pos = originalGeom.getAttribute('position');
  const V = pos.array;
  const newPositions = [];
  const newNormals = [];
  
  // Process triangles and clip them to the voxel box
  for (let i = 0; i < V.length; i += 9) {
    const v0 = new THREE.Vector3(V[i], V[i+1], V[i+2]);
    const v1 = new THREE.Vector3(V[i+3], V[i+4], V[i+5]);
    const v2 = new THREE.Vector3(V[i+6], V[i+7], V[i+8]);
    
    // Check if triangle intersects with voxel box
    const clippedTriangles = clipTriangleToBox(v0, v1, v2, voxelBox);
    
    for (const triangle of clippedTriangles) {
      // Add all three vertices
      newPositions.push(triangle[0].x, triangle[0].y, triangle[0].z);
      newPositions.push(triangle[1].x, triangle[1].y, triangle[1].z);
      newPositions.push(triangle[2].x, triangle[2].y, triangle[2].z);
    }
  }
  
  if (newPositions.length === 0) return null;
  
  const cutGeom = new THREE.BufferGeometry();
  cutGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3));
  cutGeom.computeBoundingBox();
  cutGeom.computeBoundingSphere();
  cutGeom.computeVertexNormals();
  
  return cutGeom;
}

function clipTriangleToBox(v0, v1, v2, box) {
  const clippedTriangles = [];
  
  // Start with the original triangle
  let currentTriangles = [[v0.clone(), v1.clone(), v2.clone()]];
  
  // Clip against each face of the box
  const faces = [
    { normal: new THREE.Vector3(1, 0, 0), point: new THREE.Vector3(box.min.x, 0, 0) },
    { normal: new THREE.Vector3(-1, 0, 0), point: new THREE.Vector3(box.max.x, 0, 0) },
    { normal: new THREE.Vector3(0, 1, 0), point: new THREE.Vector3(0, box.min.y, 0) },
    { normal: new THREE.Vector3(0, -1, 0), point: new THREE.Vector3(0, box.max.y, 0) },
    { normal: new THREE.Vector3(0, 0, 1), point: new THREE.Vector3(0, 0, box.min.z) },
    { normal: new THREE.Vector3(0, 0, -1), point: new THREE.Vector3(0, 0, box.max.z) }
  ];
  
  for (const face of faces) {
    const newTriangles = [];
    
    for (const triangle of currentTriangles) {
      const clipped = clipTriangleToPlane(triangle, face.normal, face.point);
      newTriangles.push(...clipped);
    }
    
    currentTriangles = newTriangles;
  }
  
  // Filter out degenerate triangles
  for (const triangle of currentTriangles) {
    if (triangle.length === 3) {
      const area = triangleArea(triangle[0], triangle[1], triangle[2]);
      if (area > 1e-6) { // Only keep triangles with significant area
        clippedTriangles.push(triangle);
      }
    }
  }
  
  return clippedTriangles;
}

function clipTriangleToPlane(triangle, planeNormal, planePoint) {
  const clipped = [];
  const vertices = [];
  
  // Classify vertices as inside or outside the plane
  for (const vertex of triangle) {
    const distance = planeNormal.dot(vertex) - planeNormal.dot(planePoint);
    vertices.push({ vertex, inside: distance <= 0 });
  }
  
  // If all vertices are inside, keep the triangle
  if (vertices.every(v => v.inside)) {
    clipped.push(triangle);
    return clipped;
  }
  
  // If all vertices are outside, discard the triangle
  if (vertices.every(v => !v.inside)) {
    return clipped;
  }
  
  // Find intersection points and create new triangles
  const newVertices = [];
  
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    
    // Add current vertex if it's inside
    if (current.inside) {
      newVertices.push(current.vertex);
    }
    
    // Add intersection point if edge crosses the plane
    if (current.inside !== next.inside) {
      const intersection = linePlaneIntersection(
        current.vertex, 
        next.vertex, 
        planeNormal, 
        planePoint
      );
      if (intersection) {
        newVertices.push(intersection);
      }
    }
  }
  
  // Create triangles from the clipped vertices
  if (newVertices.length >= 3) {
    for (let i = 1; i < newVertices.length - 1; i++) {
      clipped.push([newVertices[0], newVertices[i], newVertices[i + 1]]);
    }
  }
  
  return clipped;
}

function linePlaneIntersection(p1, p2, planeNormal, planePoint) {
  const direction = p2.clone().sub(p1);
  const denominator = planeNormal.dot(direction);
  
  if (Math.abs(denominator) < 1e-10) {
    return null; // Line is parallel to plane
  }
  
  const t = planeNormal.dot(planePoint.clone().sub(p1)) / denominator;
  
  if (t < 0 || t > 1) {
    return null; // Intersection is outside the line segment
  }
  
  return p1.clone().add(direction.multiplyScalar(t));
}

function triangleArea(v0, v1, v2) {
  const v0v1 = v1.clone().sub(v0);
  const v0v2 = v2.clone().sub(v0);
  return v0v1.cross(v0v2).length() / 2;
}

// Loading bar helpers
function showLoading(container, progressBar, textElement, text) {
  container.classList.add('active');
  progressBar.style.width = '0%';
  textElement.innerHTML = `<span class="loading-spinner"></span>${text}`;
}

function updateProgress(progressBar, textElement, percent, text) {
  progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  if (text) textElement.innerHTML = `<span class="loading-spinner"></span>${text}`;
}

function hideLoading(container) {
  container.classList.remove('active');
}

function getSliceGeometryContext() {
  if (!geom) throw new Error('No geometry loaded');

  let pos;
  let box;

  if (blockMode && blocks.length > 0) {
    const visibleBlocks = blocks.filter(block => block.visible);
    if (visibleBlocks.length === 0) {
      throw new Error('No visible blocks selected');
    }

    const mergedGeom = mergeBlockGeometries(visibleBlocks);
    if (!mergedGeom) {
      throw new Error('No geometry found in visible blocks');
    }

    pos = mergedGeom.getAttribute('position');
    box = mergedGeom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(pos);
  } else {
    pos = geom.getAttribute('position');
    box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(pos);
  }

  const axisIdx = axisToIndex(currentAxis);
  const minA = box.min.getComponent(axisIdx);
  const maxA = box.max.getComponent(axisIdx);
  const modelSizeUnits = maxA - minA;

  return { pos, box, minA, maxA, modelSizeUnits };
}

function getSliceProjectionAtIndex(sliceIndex, context = null) {
  const { pos, minA, modelSizeUnits } = context ?? getSliceGeometryContext();
  const a = minA + (sliceIndex + 0.5) * (modelSizeUnits / sliceCount);
  const V = pos.array;
  const segments = [];

  for (let i = 0; i < V.length; i += 9) {
    const a0 = new THREE.Vector3(V[i], V[i + 1], V[i + 2]);
    const a1 = new THREE.Vector3(V[i + 3], V[i + 4], V[i + 5]);
    const a2 = new THREE.Vector3(V[i + 6], V[i + 7], V[i + 8]);
    const seg = triPlaneIntersectSegment(a0, a1, a2, currentAxis, a);
    if (seg) segments.push(seg);
  }

  const polylines = stitchSegments(segments);
  const proj = projectPolylinesTo2D(polylines, currentAxis);
  const bounds = proj.length > 0 ? bounds2D(proj) : null;

  return { proj, bounds, sliceIndex };
}

function drawSliceProjections(ctx, projections, size, options = {}) {
  const {
    background = '#0d0d10',
    emptyColor = '#f87171',
    showLabels = false,
  } = options;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  const validProjections = projections.filter(
    (sliceData) =>
      sliceData.proj.length > 0 &&
      sliceData.bounds &&
      sliceData.bounds.maxX > sliceData.bounds.minX &&
      sliceData.bounds.maxY > sliceData.bounds.minY,
  );

  if (validProjections.length === 0) {
    ctx.strokeStyle = emptyColor;
    ctx.lineWidth = 2;
    const centerX = size / 2;
    const centerY = size / 2;
    const crossSize = Math.max(12, size * 0.12);

    ctx.beginPath();
    ctx.moveTo(centerX - crossSize, centerY);
    ctx.lineTo(centerX + crossSize, centerY);
    ctx.moveTo(centerX, centerY - crossSize);
    ctx.lineTo(centerX, centerY + crossSize);
    ctx.stroke();
    return;
  }

  let allBounds = { ...validProjections[0].bounds };
  for (const sliceData of validProjections.slice(1)) {
    allBounds.minX = Math.min(allBounds.minX, sliceData.bounds.minX);
    allBounds.minY = Math.min(allBounds.minY, sliceData.bounds.minY);
    allBounds.maxX = Math.max(allBounds.maxX, sliceData.bounds.maxX);
    allBounds.maxY = Math.max(allBounds.maxY, sliceData.bounds.maxY);
  }

  const width = allBounds.maxX - allBounds.minX;
  const height = allBounds.maxY - allBounds.minY;
  if (width <= 0 || height <= 0) return;

  const scale = Math.min(size / width, size / height) * (showLabels ? 0.8 : 0.88);
  const offsetX = (size - width * scale) / 2;
  const offsetY = (size - height * scale) / 2;

  for (const sliceData of validProjections) {
    const { proj, color = '#34d399', lineWidth = 2, label } = sliceData;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const pl of proj) {
      if (pl.length < 2) continue;

      ctx.beginPath();
      for (let i = 0; i < pl.length; i++) {
        const x = offsetX + (pl[i][0] - allBounds.minX) * scale;
        const y = offsetY + (pl[i][1] - allBounds.minY) * scale;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (showLabels && label) {
      ctx.fillStyle = color;
      ctx.font = '12px IBM Plex Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, 10, 18 + validProjections.indexOf(sliceData) * 15);
    }
  }
}

function renderSliceImageDataUrl(sliceIndex, options = {}) {
  const {
    size = 400,
    mode = 'single',
    background = '#0d0d10',
  } = options;

  const context = getSliceGeometryContext();
  const projections = [];

  if (mode === 'comparison') {
    if (sliceIndex > 0) {
      const previous = getSliceProjectionAtIndex(sliceIndex - 1, context);
      projections.push({
        ...previous,
        color: '#7dd3fc',
        lineWidth: 2,
        label: 'Previous',
      });
    }

    const current = getSliceProjectionAtIndex(sliceIndex, context);
    projections.push({
      ...current,
      color: '#f4f4f5',
      lineWidth: 4,
      label: 'Current',
    });

    if (sliceIndex < sliceCount - 1) {
      const next = getSliceProjectionAtIndex(sliceIndex + 1, context);
      projections.push({
        ...next,
        color: '#71717a',
        lineWidth: 2,
        label: 'Next',
      });
    }
  } else {
    const current = getSliceProjectionAtIndex(sliceIndex, context);
    projections.push({
      ...current,
      color: '#34d399',
      lineWidth: 2,
    });
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  drawSliceProjections(ctx, projections, size, {
    background,
    showLabels: mode === 'comparison',
  });

  return canvas.toDataURL('image/png');
}

function updateSlicePreview(sliceIndex) {
  if (!geom) return null;

  const imageDataUrl = renderSliceImageDataUrl(sliceIndex, {
    size: 480,
    mode: 'single',
  });

  sliceImage.src = imageDataUrl;
  sliceImage.style.display = 'block';
  imagePlaceholder.style.display = 'none';
  imagePreviewSection.style.display = 'block';
  return imageDataUrl;
}

function highlightSliceGalleryItem(sliceIndex) {
  if (!sliceGalleryGrid) return;

  sliceGalleryGrid.querySelectorAll('.slice-thumb').forEach((button) => {
    const isActive = Number(button.dataset.sliceIndex) === sliceIndex;
    button.classList.toggle('slice-thumb-active', isActive);
  });

  const activeButton = sliceGalleryGrid.querySelector(
    `.slice-thumb[data-slice-index="${sliceIndex}"]`,
  );
  if (activeButton) {
    activeButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function selectSlice(sliceIndex, options = {}) {
  if (!geom || sliceCount <= 0) return;

  const nextIndex = clamp(sliceIndex, 0, sliceCount - 1);
  activeSliceIndex = nextIndex;
  updatePreviewPlane(nextIndex);
  updateSlicePreview(nextIndex);

  if (options.updateGalleryHighlight !== false) {
    highlightSliceGalleryItem(nextIndex);
  }
}

function clearSliceGallery(message = 'Load a model to see all slice thumbnails here.') {
  galleryBuildToken += 1;
  sliceThumbnailCache = [];
  hideLoading(sliceGalleryLoading);

  if (!sliceGalleryGrid) return;

  sliceGalleryGrid.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'slice-gallery-empty';
  empty.textContent = message;
  sliceGalleryGrid.appendChild(empty);

  if (sliceGalleryCount) {
    sliceGalleryCount.textContent = '0 slices';
  }
}

function createSliceGalleryItem(sliceIndex, imageDataUrl) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'slice-thumb';
  button.dataset.sliceIndex = String(sliceIndex);

  const image = document.createElement('img');
  image.src = imageDataUrl;
  image.alt = `Slice ${sliceIndex + 1}`;

  const label = document.createElement('span');
  label.className = 'slice-thumb-label';
  label.textContent = `Slice ${sliceIndex + 1}`;

  button.appendChild(image);
  button.appendChild(label);
  button.addEventListener('click', () => {
    selectSlice(sliceIndex, { updateGalleryHighlight: true });
  });

  return button;
}

async function buildSliceGallery() {
  if (!geom || sliceCount <= 0) {
    clearSliceGallery();
    return;
  }

  const buildToken = ++galleryBuildToken;
  sliceThumbnailCache = new Array(sliceCount);
  sliceGalleryGrid.innerHTML = '';
  sliceGalleryCount.textContent = `${sliceCount} slices`;
  showLoading(sliceGalleryLoading, sliceGalleryProgress, sliceGalleryText, 'Building thumbnails...');

  const batchSize = 8;
  let processed = 0;

  for (let start = 0; start < sliceCount; start += batchSize) {
    if (buildToken !== galleryBuildToken) return;

    const end = Math.min(start + batchSize, sliceCount);
    for (let sliceIndex = start; sliceIndex < end; sliceIndex++) {
      const imageDataUrl = renderSliceImageDataUrl(sliceIndex, {
        size: 128,
        mode: 'single',
      });
      sliceThumbnailCache[sliceIndex] = imageDataUrl;

      const emptyState = sliceGalleryGrid.querySelector('.slice-gallery-empty');
      if (emptyState) emptyState.remove();

      sliceGalleryGrid.appendChild(createSliceGalleryItem(sliceIndex, imageDataUrl));
    }

    processed = end;
    const percent = Math.round((processed / sliceCount) * 100);
    updateProgress(
      sliceGalleryProgress,
      sliceGalleryText,
      percent,
      `Building thumbnails... ${processed}/${sliceCount}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (buildToken !== galleryBuildToken) return;

  hideLoading(sliceGalleryLoading);
  highlightSliceGalleryItem(activeSliceIndex);
}

function scheduleSliceGalleryBuild() {
  clearSliceGallery('Generating slice thumbnails...');
  requestAnimationFrame(() => {
    buildSliceGallery().catch((error) => {
      console.error(error);
      clearSliceGallery('Failed to build slice gallery.');
      setStatus('Failed to build slice gallery: ' + error.message);
    });
  });
}

// Extract slice as image with previous and next slices
function extractSliceAsImage(sliceIndex) {
  const imageDataUrl = renderSliceImageDataUrl(sliceIndex, {
    size: 400,
    mode: 'comparison',
    background: '#ffffff',
  });
  updateSlicePreview(sliceIndex);
  return imageDataUrl;
}

// Panel info update function
function updatePanelInfo() {
  if (!geom) {
    panelInfo.textContent = 'Panels: — | Model height: — cm';
    return;
  }
  
  // Get actual model height from geometry
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const axisIndex = axisToIndex(currentAxis);
  const modelSizeUnits = box.max.getComponent(axisIndex) - box.min.getComponent(axisIndex);
  const actualModelHeightCm = modelSizeUnits * cmPerUnit;
  
  const numPanels = Math.max(1, Math.ceil(actualModelHeightCm / panelThicknessCm));
  
  
  panelInfo.textContent = `Panels: ${numPanels} | Model height: ${actualModelHeightCm.toFixed(1)} cm`;
}

function placeGeometryOnFloor(geometry, floorY = 0) {
  if (!geometry?.attributes?.position) return;

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const offsetY = floorY - box.min.y;
  if (Math.abs(offsetY) < 1e-9) return;

  geometry.translate(0, offsetY, 0);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

function fitViewToBox(box) {
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let dist = (maxDim / 2) / Math.tan(fov / 2);
  dist *= 1.3;

  camera.position.copy(center).add(new THREE.Vector3(dist, dist, dist));
  camera.near = dist / 100;
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();

  planeHelper.size = maxDim * 1.1;
}

function mergeGroupGeometries(group) {
  const positions = [];
  group.traverse((c) => {
    if (c.isMesh && c.geometry?.attributes?.position) {
      const pos = c.geometry.attributes.position.array;
      positions.push(pos);
    }
  });
  if (!positions.length) return null;
  const totalFloats = positions.reduce((s, a) => s + a.length, 0);
  const merged = new Float32Array(totalFloats);
  let o = 0;
  for (const arr of positions) {
    merged.set(arr, o);
    o += arr.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(merged, 3));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  g.computeVertexNormals(); // Add normals for proper lighting
  return g;
}

function computeSlicesFromInputs(){
  if (!geom) {
    console.log('No geometry loaded');
    return;
  }
  
  panelThicknessCm = clamp(+panelThicknessInput.value || 1, 0.1, 100);
  cmPerUnit = clamp(+cmPerUnitInput.value || 285.3, 0.001, 100000);
  currentAxis = axisSelect.value;

  // Get actual model bounds from geometry
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const axisIndex = axisToIndex(currentAxis);
  const modelMin = box.min.getComponent(axisIndex);
  const modelMax = box.max.getComponent(axisIndex);
  const modelSizeUnits = modelMax - modelMin;

  // Calculate actual model height in cm from geometry
  const actualModelHeightCm = modelSizeUnits * cmPerUnit;

  // Calculate number of slices based on model height and panel thickness
  let n = Math.max(1, Math.ceil(actualModelHeightCm / panelThicknessCm));
  
  // If we get 1 slice but the model has size, there might be an issue with the calculation
  if (n === 1 && modelSizeUnits > 0) {
    // Try calculating based on OBJ units directly
    const panelThicknessUnits = panelThicknessCm / cmPerUnit;
    n = Math.max(1, Math.ceil(modelSizeUnits / panelThicknessUnits));
  }
  
  sliceCount = n;
  slider.max = String(Math.max(0, n - 1));
  slider.value = "0";
  slider.disabled = false;
  
  // Enable arrow buttons if we have more than 1 slice
  prevSliceBtn.disabled = n <= 1;
  nextSliceBtn.disabled = n <= 1;

  // Precompute plane positions based on panel thickness
  slicePositions = [];
  for (let i = 0; i < n; i++) {
    // Position panels based on panel thickness
    const pos = modelMin + (i + 0.5) * (modelSizeUnits / n); // center of each panel
    slicePositions.push(pos);
  }

  selectSlice(0, { updateGalleryHighlight: false });
  scheduleSliceGalleryBuild();
  
  // Update slice info based on block mode
  if (blockMode && blocks.length > 0) {
    const visibleBlocks = blocks.filter(block => block.visible).length;
    sliceInfo.textContent = `Preview ${parseInt(slider.value) + 1} / ${n} (${panelThicknessCm}cm panels, ${visibleBlocks}/${blocks.length} blocks visible, axis ${currentAxis})`;
  } else {
    sliceInfo.textContent = `Preview ${parseInt(slider.value) + 1} / ${n} (${panelThicknessCm}cm panels, model height: ${actualModelHeightCm.toFixed(1)} cm, axis ${currentAxis})`;
  }
}

function axisToIndex(a){ return a === 'X' ? 0 : a === 'Y' ? 1 : 2; }
function axisNormal(axis){
  return axis === 'X' ? new THREE.Vector3(1,0,0)
       : axis === 'Y' ? new THREE.Vector3(0,1,0)
       : new THREE.Vector3(0,0,1);
}

function updatePreviewPlane(i){
  if (!geom || slicePositions.length===0) return;
  i = clamp(i, 0, slicePositions.length-1);
  slider.value = String(i);
  const n = axisNormal(currentAxis);
  const d = -slicePositions[i]; // plane: n·x + d = 0
  previewPlane.set(n, d);
  
  // Enable clipping only when we have a valid slice position and clipping is enabled
  if (slicePositions.length > 0 && isClippingEnabled) {
    clipMaterial.clippingPlanes = [previewPlane];
  } else {
    clipMaterial.clippingPlanes = [];
  }
  
  planeHelper.plane = previewPlane;
  planeHelper.updateMatrixWorld(true);
  
  // Update slice info display
  sliceInfo.textContent = `Preview ${i + 1} / ${sliceCount} (axis ${currentAxis})`;
  
  // Update arrow button states
  prevSliceBtn.disabled = i <= 0;
  nextSliceBtn.disabled = i >= sliceCount - 1;
}

// Arrow button event listeners
prevSliceBtn.addEventListener('click', () => {
  const currentValue = parseInt(slider.value, 10);
  if (currentValue > 0) {
    selectSlice(currentValue - 1, { updateGalleryHighlight: true });
  }
});

nextSliceBtn.addEventListener('click', () => {
  const currentValue = parseInt(slider.value, 10);
  const maxValue = parseInt(slider.max, 10);
  if (currentValue < maxValue) {
    selectSlice(currentValue + 1, { updateGalleryHighlight: true });
  }
});

downloadAllBtn.addEventListener('click', async () => {
  if (!geom) return;
  
  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = 'Generating...';
  
  try {
    setStatus('Generating all slice images...');
    
    // Create a new JSZip instance
    const zip = new JSZip();
    
    // Get the total number of slices
    const totalSlices = sliceCount;
    
    // Process slices in batches to avoid blocking the UI
    const batchSize = 10;
    let processedSlices = 0;
    
    for (let i = 0; i < totalSlices; i += batchSize) {
      const batch = [];
      
      // Process current batch
      for (let j = i; j < Math.min(i + batchSize, totalSlices); j++) {
        batch.push(
          Promise.resolve(
            renderSliceImageDataUrl(j, {
              size: 400,
              mode: 'single',
              background: '#ffffff',
            }),
          ),
        );
      }
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batch);
      
      // Add images to zip
      batchResults.forEach((imageDataUrl, index) => {
        const sliceIndex = i + index;
        const filename = `slice_${String(sliceIndex + 1).padStart(3, '0')}.png`;
        
        // Convert data URL to blob
        const base64Data = imageDataUrl.split(',')[1];
        zip.file(filename, base64Data, { base64: true });
      });
      
      processedSlices += batch.length;
      
      // Update progress
      const progress = Math.round((processedSlices / totalSlices) * 100);
      setStatus(`Generating all slice images... ${progress}% (${processedSlices}/${totalSlices})`);
      
      // Small delay to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Generate the zip file
    setStatus('Creating zip file...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Download the zip file
    const filename = `slices_${totalSlices}_panels.zip`;
    downloadBlob(zipBlob, filename);
    
    setStatus(`Downloaded ${totalSlices} slice images as ${filename}`);
    
  } catch (error) {
    console.error('Error generating all images:', error);
    setStatus('Error generating images: ' + error.message);
  } finally {
    downloadAllBtn.disabled = false;
    downloadAllBtn.textContent = 'Download All Images';
  }
});

downloadObjBtn.addEventListener('click', () => {
  if (!geom) return;
  
  try {
    setStatus('Generating modified OBJ file...');
    
    // Get the current geometry (which may be modified by scaling, block mode, etc.)
    let currentGeom = geom;
    
    // If in block mode, merge visible blocks
    if (blockMode && blocks.length > 0) {
      const visibleBlocks = blocks.filter(block => block.visible);
      if (visibleBlocks.length > 0) {
        const mergedGeom = mergeBlockGeometries(visibleBlocks);
        if (mergedGeom) {
          currentGeom = mergedGeom;
        }
      }
    }
    
    // If in LEGO mode, we can't export as OBJ (voxels are not suitable for OBJ format)
    if (legoMode) {
      setStatus('Cannot export LEGO voxels as OBJ. Please disable LEGO mode first.');
      return;
    }
    
    // Convert geometry to OBJ format
    const objContent = geometryToOBJ(currentGeom);
    
    // Create and download the file
    const blob = new Blob([objContent], { type: 'text/plain' });
    const filename = `modified_model_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.obj`;
    downloadBlob(blob, filename);
    
    setStatus(`Downloaded modified OBJ as ${filename}`);
    
  } catch (error) {
    console.error('Error generating OBJ:', error);
    setStatus('Error generating OBJ: ' + error.message);
  }
});

downloadGridImgBtn.addEventListener('click', () => {
  if (!geom) return;
  
  try {
    setStatus('Opening front view grid...');
    openFrontViewGrid();
  } catch (error) {
    console.error('Error opening front view grid:', error);
    setStatus('Error opening front view grid: ' + error.message);
  }
});

// Interactive Grid Modal
let interactiveModal = null;
let interactiveCanvas = null;
let interactiveCtx = null;
let allCrossSections = [];
let visibleLevels = new Set();
let maxZLevel = 0;

showInteractiveGridBtn.addEventListener('click', () => {
  if (!geom) return;
  
  // Show modal
  interactiveModal = document.getElementById('interactiveGridModal');
  interactiveModal.style.display = 'block';
  
  // Initialize interactive canvas
  interactiveCanvas = document.getElementById('interactiveCanvas');
  interactiveCtx = interactiveCanvas.getContext('2d');
  
  // Generate all cross-sections
  generateAllCrossSections();
  
  // Setup event listeners
  setupInteractiveModalEvents();
  
  // Add window resize listener for responsive canvas
  const resizeHandler = () => {
    if (interactiveModal && interactiveModal.style.display !== 'none') {
      drawInteractiveView();
    }
  };
  window.addEventListener('resize', resizeHandler);
  
  // Store resize handler for cleanup
  interactiveModal.resizeHandler = resizeHandler;
  
  // Draw initial view
  drawInteractiveView();
});

// Generate all cross-sections for interactive view
function generateAllCrossSections() {
  if (!geom) return;
  
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const blockDepthUnits = blockDepthCm / cmPerUnit;
  const intermediateDepthUnits = 2.5 / cmPerUnit; // 2.5cm in OBJ units
  const modelDepth = box.max.z - box.min.z;
  const numLevels = Math.max(1, Math.ceil(modelDepth / blockDepthUnits));
  
  allCrossSections = [];
  maxZLevel = numLevels - 1;
  
  // Get geometry for outline extraction
  let currentGeom = geom;
  if (blockMode && blocks.length > 0) {
    const visibleBlocks = blocks.filter(block => block.visible);
    if (visibleBlocks.length > 0) {
      const mergedGeom = mergeBlockGeometries(visibleBlocks);
      if (mergedGeom) {
        currentGeom = mergedGeom;
      }
    }
  }
  
  // Generate main cross-sections (every 5cm)
  for (let level = 0; level < numLevels; level++) {
    const z = box.min.z + (level + 0.5) * blockDepthUnits;
    const crossSection = extractCrossSectionAtZ(currentGeom, z);
    allCrossSections.push({
      level: level,
      z: z,
      crossSection: crossSection,
      isMain: true
    });
  }
  
  // Generate intermediate cross-sections (every 2.5cm)
  const numIntermediateLevels = Math.max(1, Math.ceil(modelDepth / intermediateDepthUnits));
  for (let level = 0; level < numIntermediateLevels; level++) {
    const z = box.min.z + (level + 0.5) * intermediateDepthUnits;
    
    // Skip if this Z level is already covered by a main cross-section
    const isMainLevel = Math.abs((z - box.min.z) % blockDepthUnits - blockDepthUnits/2) < 0.001;
    if (isMainLevel) continue;
    
    const crossSection = extractCrossSectionAtZ(currentGeom, z);
    if (crossSection.length > 0) { // Only add if there's actual geometry at this level
      allCrossSections.push({
        level: level + numLevels, // Offset to avoid conflicts with main levels
        z: z,
        crossSection: crossSection,
        isMain: false
      });
    }
  }
  
  // Initially show all main levels only
  visibleLevels.clear();
  for (let i = 0; i < numLevels; i++) {
    visibleLevels.add(i);
  }
}

// Setup interactive modal event listeners
function setupInteractiveModalEvents() {
  const zLevelSlider = document.getElementById('zLevelSlider');
  const zLevelValue = document.getElementById('zLevelValue');
  const showAllLevelsBtn = document.getElementById('showAllLevelsBtn');
  const showMainLevelsBtn = document.getElementById('showMainLevelsBtn');
  const showIntermediateLevelsBtn = document.getElementById('showIntermediateLevelsBtn');
  const hideAllLevelsBtn = document.getElementById('hideAllLevelsBtn');
  const downloadCurrentViewBtn = document.getElementById('downloadCurrentViewBtn');
  const closeModal = document.getElementById('closeInteractiveModal');
  const panelXInput = document.getElementById('panelXInput');
  const panelYInput = document.getElementById('panelYInput');
  const viewPanelBtn = document.getElementById('viewPanelBtn');
  
  // Update slider range to only main levels (5cm intervals)
  zLevelSlider.max = maxZLevel;
  zLevelSlider.value = maxZLevel;
  zLevelValue.textContent = `${(allCrossSections[maxZLevel]?.z * cmPerUnit || 0).toFixed(1)}cm`;
  
  // Z level slider - controls both main and intermediate levels
  zLevelSlider.addEventListener('input', () => {
    const mainLevel = parseInt(zLevelSlider.value);
    const z = allCrossSections[mainLevel]?.z || 0;
    zLevelValue.textContent = `${(z * cmPerUnit).toFixed(1)}cm`;
    
    // Find the corresponding intermediate level (2.5cm offset)
    const intermediateZ = z + (2.5 / cmPerUnit);
    const intermediateLevel = allCrossSections.findIndex(cs => 
      !cs.isMain && Math.abs(cs.z - intermediateZ) < 0.001
    );
    
    // Toggle visibility of both main and intermediate levels
    if (visibleLevels.has(mainLevel)) {
      visibleLevels.delete(mainLevel);
      if (intermediateLevel !== -1) {
        visibleLevels.delete(intermediateLevel);
      }
    } else {
      visibleLevels.add(mainLevel);
      if (intermediateLevel !== -1) {
        visibleLevels.add(intermediateLevel);
      }
    }
    
    drawInteractiveView();
  });
  
  // Show all levels
  showAllLevelsBtn.addEventListener('click', () => {
    visibleLevels.clear();
    for (let i = 0; i < allCrossSections.length; i++) {
      visibleLevels.add(i);
    }
    drawInteractiveView();
  });
  
  // Show main levels only
  showMainLevelsBtn.addEventListener('click', () => {
    visibleLevels.clear();
    for (let i = 0; i < allCrossSections.length; i++) {
      if (allCrossSections[i].isMain) {
        visibleLevels.add(i);
      }
    }
    drawInteractiveView();
  });
  
  // Show intermediate levels only
  showIntermediateLevelsBtn.addEventListener('click', () => {
    visibleLevels.clear();
    for (let i = 0; i < allCrossSections.length; i++) {
      if (!allCrossSections[i].isMain) {
        visibleLevels.add(i);
      }
    }
    drawInteractiveView();
  });
  
  // Hide all levels
  hideAllLevelsBtn.addEventListener('click', () => {
    visibleLevels.clear();
    drawInteractiveView();
  });
  
  // Download current view
  downloadCurrentViewBtn.addEventListener('click', () => {
    const imageDataUrl = interactiveCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `interactive_view_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.click();
  });
  
  // Close modal
  closeModal.addEventListener('click', () => {
    closeInteractiveModal();
  });
  
  // Close modal when clicking outside
  interactiveModal.addEventListener('click', (e) => {
    if (e.target === interactiveModal) {
      closeInteractiveModal();
    }
  });
  
  // View panel detail button
  viewPanelBtn.addEventListener('click', () => {
    const panelX = parseInt(panelXInput.value) || 5;
    const panelY = parseInt(panelYInput.value) || 2;
    openPanelDetailView(panelX, panelY);
  });
}

// Close interactive modal and cleanup
function closeInteractiveModal() {
  if (interactiveModal) {
    interactiveModal.style.display = 'none';
    
    // Remove resize listener
    if (interactiveModal.resizeHandler) {
      window.removeEventListener('resize', interactiveModal.resizeHandler);
      interactiveModal.resizeHandler = null;
    }
  }
}

// Draw the interactive view
function drawInteractiveView() {
  if (!interactiveCtx || !allCrossSections.length) return;
  
  const canvas = interactiveCanvas;
  const ctx = interactiveCtx;
  
  // Get the actual canvas container size
  const container = canvas.parentElement;
  const containerRect = container.getBoundingClientRect();
  const containerSize = Math.min(containerRect.width - 20, containerRect.height - 20); // Account for padding
  
  // Use higher resolution for better quality
  const pixelRatio = window.devicePixelRatio || 1;
  const displaySize = containerSize;
  const actualSize = displaySize * pixelRatio;
  
  // Update canvas size to fit container with high resolution
  canvas.width = actualSize;
  canvas.height = actualSize;
  canvas.style.width = displaySize + 'px';
  canvas.style.height = displaySize + 'px';
  
  // Scale the context to match the device pixel ratio
  ctx.scale(pixelRatio, pixelRatio);
  
  const size = displaySize;
  
  // Clear canvas
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);
  
  // Get model bounds
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const modelWidth = box.max.x - box.min.x;
  const modelHeight = box.max.y - box.min.y;
  const modelCenterX = (box.max.x + box.min.x) / 2;
  const modelCenterY = (box.max.y + box.min.y) / 2;
  
  // Calculate scale
  const margin = 0.1;
  const scale = Math.min(
    (size * (1 - 2 * margin)) / modelWidth,
    (size * (1 - 2 * margin)) / modelHeight
  );
  
  const offsetX = size / 2 - modelCenterX * scale;
  const offsetY = size / 2 - modelCenterY * scale;
  
  // Draw block grid overlay first (so it's behind the cross-sections)
  drawBlockGrid(ctx, box, offsetX, offsetY, scale);
  
  // Draw visible cross-sections
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // First draw intermediate cross-sections (solid gray lines)
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  
  for (const level of visibleLevels) {
    const crossSectionData = allCrossSections[level];
    if (!crossSectionData || crossSectionData.isMain) continue;
    
    const crossSection = crossSectionData.crossSection;
    
    // Draw each polyline
    for (const polyline of crossSection) {
      if (polyline.length >= 2) {
        ctx.beginPath();
        for (let i = 0; i < polyline.length; i++) {
          const canvasX = offsetX + polyline[i].x * scale;
          const canvasY = offsetY + (box.max.y - polyline[i].y) * scale;
          
          if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        }
        ctx.stroke();
      }
    }
  }
  
  // Then draw main cross-sections (solid lines)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  
  for (const level of visibleLevels) {
    const crossSectionData = allCrossSections[level];
    if (!crossSectionData || !crossSectionData.isMain) continue;
    
    const crossSection = crossSectionData.crossSection;
    
    // Draw each polyline
    for (const polyline of crossSection) {
      if (polyline.length >= 2) {
        ctx.beginPath();
        for (let i = 0; i < polyline.length; i++) {
          const canvasX = offsetX + polyline[i].x * scale;
          const canvasY = offsetY + (box.max.y - polyline[i].y) * scale;
          
          if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        }
        ctx.stroke();
      }
    }
  }
  
  // Add info text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Interactive Cross-Sections View', size / 2, 30);
  
  // Count main and intermediate levels
  const mainLevels = allCrossSections.filter(cs => cs.isMain).length;
  const intermediateLevels = allCrossSections.filter(cs => !cs.isMain).length;
  const visibleMain = Array.from(visibleLevels).filter(i => allCrossSections[i]?.isMain).length;
  const visibleIntermediate = Array.from(visibleLevels).filter(i => allCrossSections[i] && !allCrossSections[i].isMain).length;
  
  ctx.font = '12px Arial';
  ctx.fillText(`Main levels: ${visibleMain}/${mainLevels} | Intermediate: ${visibleIntermediate}/${intermediateLevels}`, size / 2, 50);
  ctx.fillText(`Black lines = Main (5cm) | Gray lines = Intermediate (2.5cm)`, size / 2, 65);
}

// Open detailed view for a specific panel
function openPanelDetailView(panelX, panelY) {
  if (!geom) {
    setStatus('No geometry loaded');
    return;
  }
  
  // Get model bounds
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  
  // Calculate panel bounds
  const blockSizeUnits = {
    x: blockWidthCm / cmPerUnit,
    y: blockHeightCm / cmPerUnit,
  };
  
  const totalBlockSizeUnits = {
    x: Math.ceil((box.max.x - box.min.x) / blockSizeUnits.x) * blockSizeUnits.x,
    y: Math.ceil((box.max.y - box.min.y) / blockSizeUnits.y) * blockSizeUnits.y,
  };
  
  const blockOffset = {
    x: (box.max.x - box.min.x - totalBlockSizeUnits.x) / 2,
    y: (box.max.y - box.min.y - totalBlockSizeUnits.y) / 2,
  };
  
  // Calculate panel bounds
  const panelMinX = box.min.x + blockOffset.x + (panelX * blockSizeUnits.x);
  const panelMaxX = panelMinX + blockSizeUnits.x;
  const panelMinY = box.min.y + blockOffset.y + (panelY * blockSizeUnits.y);
  const panelMaxY = panelMinY + blockSizeUnits.y;
  
  // Check if panel is within bounds
  const maxPanelX = Math.ceil(totalBlockSizeUnits.x / blockSizeUnits.x) - 1;
  const maxPanelY = Math.ceil(totalBlockSizeUnits.y / blockSizeUnits.y) - 1;
  
  if (panelX < 0 || panelX > maxPanelX || panelY < 0 || panelY > maxPanelY) {
    setStatus(`Panel (${panelX}, ${panelY}) is out of bounds. Max: (${maxPanelX}, ${maxPanelY})`);
    return;
  }
  
  // Create new window
  const newWindow = window.open('', '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes');
  
  // Create HTML content for the panel detail view
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Panel Detail View - Block (${panelX}, ${panelY})</title>
      <style>
        body { 
          margin: 0; 
          padding: 20px; 
          font-family: Arial, sans-serif; 
          background: #f5f5f5;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: #222;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .panel-info {
          padding: 20px;
          background: #f9f9f9;
          border-bottom: 1px solid #ddd;
          text-align: center;
        }
        .controls {
          padding: 20px;
          background: #f0f0f0;
          border-bottom: 1px solid #ddd;
        }
        .controls label {
          display: block;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .controls input[type="range"] {
          width: 100%;
          margin-bottom: 15px;
        }
        .control-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .control-buttons button {
          padding: 8px 16px;
          font-size: 12px;
        }
        .canvas-container {
          padding: 20px;
          text-align: center;
          background: white;
        }
        .canvas-container canvas {
          border: 1px solid #ddd;
          border-radius: 5px;
          max-width: 100%;
          height: auto;
        }
        .info {
          padding: 10px 20px;
          background: #e9ecef;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Panel Detail View</h1>
        </div>
        <div class="panel-info">
          <h2>Block Panel (${panelX}, ${panelY})</h2>
          <p>Dimensions: ${blockWidthCm}cm × ${blockHeightCm}cm × ${blockDepthCm}cm</p>
          <p>Position: X: ${(panelMinX * cmPerUnit).toFixed(1)}cm - ${(panelMaxX * cmPerUnit).toFixed(1)}cm | Y: ${(panelMinY * cmPerUnit).toFixed(1)}cm - ${(panelMaxY * cmPerUnit).toFixed(1)}cm</p>
        </div>
        <div class="controls">
          <label for="panelZLevelSlider">Z Level: <span id="panelZLevelValue">0.0cm</span></label>
          <input type="range" id="panelZLevelSlider" min="0" max="100" value="0" step="1" />
          <div class="control-buttons">
            <button id="panelShowAllBtn">Show All</button>
            <button id="panelShowMainBtn">Show Main Only</button>
            <button id="panelShowIntermediateBtn">Show Intermediate</button>
            <button id="panelHideAllBtn">Hide All</button>
            <button id="panelDownloadBtn">Download View</button>
          </div>
        </div>
        <div class="canvas-container">
          <canvas id="panelCanvas" width="1000" height="1000"></canvas>
        </div>
        <div class="info">
          Detailed cross-sections for this specific panel block
        </div>
      </div>
      
      <script>
        // Panel data
        const panelData = {
          panelX: ${panelX},
          panelY: ${panelY},
          panelMinX: ${panelMinX},
          panelMaxX: ${panelMaxX},
          panelMinY: ${panelMinY},
          panelMaxY: ${panelMaxY},
          boxMinX: ${box.min.x},
          boxMaxX: ${box.max.x},
          boxMinY: ${box.min.y},
          boxMaxY: ${box.max.y},
          boxMinZ: ${box.min.z},
          boxMaxZ: ${box.max.z},
          blockWidthCm: ${blockWidthCm},
          blockHeightCm: ${blockHeightCm},
          blockDepthCm: ${blockDepthCm},
          cmPerUnit: ${cmPerUnit}
        };
        
        // Cross-section data
        let panelCrossSections = [];
        let panelVisibleLevels = new Set();
        let panelMaxZLevel = 0;
        
        // Initialize panel detail view
        function initializePanelDetail() {
          const canvas = document.getElementById('panelCanvas');
          const ctx = canvas.getContext('2d');
          
          // Generate panel cross-sections
          generatePanelCrossSections();
          
          // Setup controls
          setupPanelControls();
          
          // Draw initial view
          drawPanelView();
        }
        
        // Generate cross-sections for this specific panel
        function generatePanelCrossSections() {
          const blockDepthUnits = panelData.blockDepthCm / panelData.cmPerUnit;
          const intermediateDepthUnits = 2.5 / panelData.cmPerUnit;
          const modelDepth = panelData.boxMaxZ - panelData.boxMinZ;
          const numLevels = Math.max(1, Math.ceil(modelDepth / blockDepthUnits));
          
          panelCrossSections = [];
          panelMaxZLevel = numLevels - 1;
          
          // Get geometry from parent window
          let currentGeom = null;
          if (window.opener && window.opener.geom) {
            currentGeom = window.opener.geom;
          }
          
          if (currentGeom) {
            // Generate main cross-sections (every 5cm)
            for (let level = 0; level < numLevels; level++) {
              const z = panelData.boxMinZ + (level + 0.5) * blockDepthUnits;
              const crossSection = extractCrossSectionAtZ(currentGeom, z);
              panelCrossSections.push({
                level: level,
                z: z,
                crossSection: crossSection,
                isMain: true
              });
            }
            
            // Generate intermediate cross-sections (every 2.5cm)
            const numIntermediateLevels = Math.max(1, Math.ceil(modelDepth / intermediateDepthUnits));
            for (let level = 0; level < numIntermediateLevels; level++) {
              const z = panelData.boxMinZ + (level + 0.5) * intermediateDepthUnits;
              
              // Skip if this Z level is already covered by a main cross-section
              const isMainLevel = Math.abs((z - panelData.boxMinZ) % blockDepthUnits - blockDepthUnits/2) < 0.001;
              if (isMainLevel) continue;
              
              const crossSection = extractCrossSectionAtZ(currentGeom, z);
              if (crossSection.length > 0) {
                panelCrossSections.push({
                  level: level + numLevels,
                  z: z,
                  crossSection: crossSection,
                  isMain: false
                });
              }
            }
          }
          
          // Initially show all main levels
          panelVisibleLevels.clear();
          for (let i = 0; i < numLevels; i++) {
            panelVisibleLevels.add(i);
          }
        }
        
        // Setup panel controls
        function setupPanelControls() {
          const zLevelSlider = document.getElementById('panelZLevelSlider');
          const zLevelValue = document.getElementById('panelZLevelValue');
          const showAllBtn = document.getElementById('panelShowAllBtn');
          const showMainBtn = document.getElementById('panelShowMainBtn');
          const showIntermediateBtn = document.getElementById('panelShowIntermediateBtn');
          const hideAllBtn = document.getElementById('panelHideAllBtn');
          const downloadBtn = document.getElementById('panelDownloadBtn');
          
          // Update slider range
          zLevelSlider.max = panelMaxZLevel;
          zLevelSlider.value = panelMaxZLevel;
          zLevelValue.textContent = \`\${(panelCrossSections[panelMaxZLevel]?.z * panelData.cmPerUnit || 0).toFixed(1)}cm\`;
          
          // Z level slider
          zLevelSlider.addEventListener('input', () => {
            const mainLevel = parseInt(zLevelSlider.value);
            const z = panelCrossSections[mainLevel]?.z || 0;
            zLevelValue.textContent = \`\${(z * panelData.cmPerUnit).toFixed(1)}cm\`;
            
            // Find the corresponding intermediate level
            const intermediateZ = z + (2.5 / panelData.cmPerUnit);
            const intermediateLevel = panelCrossSections.findIndex(cs => 
              !cs.isMain && Math.abs(cs.z - intermediateZ) < 0.001
            );
            
            // Toggle visibility of both main and intermediate levels
            if (panelVisibleLevels.has(mainLevel)) {
              panelVisibleLevels.delete(mainLevel);
              if (intermediateLevel !== -1) {
                panelVisibleLevels.delete(intermediateLevel);
              }
            } else {
              panelVisibleLevels.add(mainLevel);
              if (intermediateLevel !== -1) {
                panelVisibleLevels.add(intermediateLevel);
              }
            }
            
            drawPanelView();
          });
          
          // Show all levels
          showAllBtn.addEventListener('click', () => {
            panelVisibleLevels.clear();
            for (let i = 0; i < panelCrossSections.length; i++) {
              panelVisibleLevels.add(i);
            }
            drawPanelView();
          });
          
          // Show main levels only
          showMainBtn.addEventListener('click', () => {
            panelVisibleLevels.clear();
            for (let i = 0; i < panelCrossSections.length; i++) {
              if (panelCrossSections[i].isMain) {
                panelVisibleLevels.add(i);
              }
            }
            drawPanelView();
          });
          
          // Show intermediate levels only
          showIntermediateBtn.addEventListener('click', () => {
            panelVisibleLevels.clear();
            for (let i = 0; i < panelCrossSections.length; i++) {
              if (!panelCrossSections[i].isMain) {
                panelVisibleLevels.add(i);
              }
            }
            drawPanelView();
          });
          
          // Hide all levels
          hideAllBtn.addEventListener('click', () => {
            panelVisibleLevels.clear();
            drawPanelView();
          });
          
          // Download current view
          downloadBtn.addEventListener('click', () => {
            const canvas = document.getElementById('panelCanvas');
            const imageDataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imageDataUrl;
            link.download = \`panel_${panelX}_${panelY}_view_\${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png\`;
            link.click();
          });
        }
        
        // Draw the panel view
        function drawPanelView() {
          const canvas = document.getElementById('panelCanvas');
          const ctx = canvas.getContext('2d');
          const size = 1000;
          
          // Clear canvas
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, size, size);
          
          // Calculate scale to fit panel
          const panelWidth = panelData.panelMaxX - panelData.panelMinX;
          const panelHeight = panelData.panelMaxY - panelData.panelMinY;
          const margin = 0.1;
          const scale = Math.min(
            (size * (1 - 2 * margin)) / panelWidth,
            (size * (1 - 2 * margin)) / panelHeight
          );
          
          const offsetX = size / 2 - ((panelData.panelMinX + panelData.panelMaxX) / 2) * scale;
          const offsetY = size / 2 - ((panelData.panelMinY + panelData.panelMaxY) / 2) * scale;
          
          // Draw panel boundary
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 6]);
          ctx.strokeRect(
            offsetX + panelData.panelMinX * scale,
            offsetY + (panelData.boxMaxY - panelData.panelMaxY) * scale,
            panelWidth * scale,
            panelHeight * scale
          );
          ctx.setLineDash([]);
          
          // Draw visible cross-sections
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // First draw intermediate cross-sections (gray lines)
          ctx.strokeStyle = '#666666';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          
          for (const level of panelVisibleLevels) {
            const crossSectionData = panelCrossSections[level];
            if (!crossSectionData || crossSectionData.isMain) continue;
            
            const crossSection = crossSectionData.crossSection;
            
            for (const polyline of crossSection) {
              if (polyline.length >= 2) {
                ctx.beginPath();
                for (let i = 0; i < polyline.length; i++) {
                  const canvasX = offsetX + polyline[i].x * scale;
                  const canvasY = offsetY + (panelData.boxMaxY - polyline[i].y) * scale;
                  
                  if (i === 0) {
                    ctx.moveTo(canvasX, canvasY);
                  } else {
                    ctx.lineTo(canvasX, canvasY);
                  }
                }
                ctx.stroke();
              }
            }
          }
          
          // Then draw main cross-sections (black lines)
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          
          for (const level of panelVisibleLevels) {
            const crossSectionData = panelCrossSections[level];
            if (!crossSectionData || !crossSectionData.isMain) continue;
            
            const crossSection = crossSectionData.crossSection;
            
            for (const polyline of crossSection) {
              if (polyline.length >= 2) {
                ctx.beginPath();
                for (let i = 0; i < polyline.length; i++) {
                  const canvasX = offsetX + polyline[i].x * scale;
                  const canvasY = offsetY + (panelData.boxMaxY - polyline[i].y) * scale;
                  
                  if (i === 0) {
                    ctx.moveTo(canvasX, canvasY);
                  } else {
                    ctx.lineTo(canvasX, canvasY);
                  }
                }
                ctx.stroke();
              }
            }
          }
          
          // Add title
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(\`Panel Block (\${panelData.panelX}, \${panelData.panelY})\`, size / 2, 30);
          
          ctx.font = '14px Arial';
          ctx.fillText(\`Dimensions: \${panelData.blockWidthCm}cm × \${panelData.blockHeightCm}cm × \${panelData.blockDepthCm}cm\`, size / 2, 55);
          
          // Add level info
          const mainLevels = panelCrossSections.filter(cs => cs.isMain).length;
          const intermediateLevels = panelCrossSections.filter(cs => !cs.isMain).length;
          const visibleMain = Array.from(panelVisibleLevels).filter(i => panelCrossSections[i]?.isMain).length;
          const visibleIntermediate = Array.from(panelVisibleLevels).filter(i => panelCrossSections[i] && !panelCrossSections[i].isMain).length;
          
          ctx.font = '12px Arial';
          ctx.fillText(\`Main levels: \${visibleMain}/\${mainLevels} | Intermediate: \${visibleIntermediate}/\${intermediateLevels}\`, size / 2, 75);
          ctx.fillText(\`Black lines = Main (5cm) | Gray lines = Intermediate (2.5cm)\`, size / 2, 90);
        }
        
        // Extract cross-section function (simplified version)
        function extractCrossSectionAtZ(geometry, z) {
          // This is a simplified version - we'll get the real function from parent
          if (window.opener && window.opener.extractCrossSectionAtZ) {
            return window.opener.extractCrossSectionAtZ(geometry, z);
          }
          return [];
        }
        
        // Initialize when window loads
        window.addEventListener('load', initializePanelDetail);
      </script>
    </body>
    </html>
  `;
  
  // Write content to new window
  newWindow.document.write(htmlContent);
  newWindow.document.close();
  
  // Pass functions and data to new window
  newWindow.addEventListener('load', () => {
    // Pass the geometry and extraction function
    newWindow.geom = geom;
    newWindow.extractCrossSectionAtZ = extractCrossSectionAtZ;
    newWindow.cmPerUnit = cmPerUnit;
    newWindow.blockWidthCm = blockWidthCm;
    newWindow.blockHeightCm = blockHeightCm;
    newWindow.blockDepthCm = blockDepthCm;
  });
  
  setStatus(`Opened panel detail view for block (${panelX}, ${panelY})`);
}

// Resize
function onResize(){
  const rect = renderer.domElement.parentElement.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', onResize);
onResize();

// Render loop
function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

const backToMapshroomLink = document.getElementById('backToMapshroomLink');
if (backToMapshroomLink) {
  backToMapshroomLink.href = new URL('../', window.location.href).href;
}

// Load bundled default model on page initialization
loadDefaultModel();

/** ====== Core slicing & PDF export ====== **/

async function sliceToPDF({ geom, axis, cmPerUnit, sliceIndex, marginCm, onProgress }) {
  // PDF constants
  const A4 = { wPt: 595.28, hPt: 841.89 }; // portrait
  const PT_PER_CM = 72 / 2.54;

  // Prepare triangles - handle block mode
  let V, box, minA, maxA, modelSizeUnits, actualModelHeightCm, a;
  
  if (blockMode && blocks.length > 0) {
    // In block mode, work with visible blocks only
    const visibleBlocks = blocks.filter(block => block.visible);
    if (visibleBlocks.length === 0) {
      throw new Error('No visible blocks selected');
    }
    
    // Merge visible block geometries
    const mergedGeom = mergeBlockGeometries(visibleBlocks);
    if (!mergedGeom) {
      throw new Error('No geometry found in visible blocks');
    }
    
    const pos = mergedGeom.getAttribute('position');
    V = pos.array;
    box = mergedGeom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(pos);
  } else {
    // Normal mode - use original geometry
    const pos = geom.getAttribute('position');
    V = pos.array; // non-indexed: triples of xyz per vertex
    box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(pos);
  }
  
  if ((V.length % 9) !== 0) throw new Error('Geometry must be triangles (non-indexed).');

  // Get actual model bounds from geometry
  const axisIdx = axisToIndex(axis);
  minA = box.min.getComponent(axisIdx);
  maxA = box.max.getComponent(axisIdx);
  modelSizeUnits = maxA - minA;

  // Calculate actual model height in cm from geometry
  actualModelHeightCm = modelSizeUnits * cmPerUnit;

  // Get the slice position from the current slider position
  a = minA + (sliceIndex + 0.5) * (modelSizeUnits / sliceCount);
  
  console.log(`Model bounds on ${axis} axis: min=${minA.toFixed(3)}, max=${maxA.toFixed(3)}, size=${modelSizeUnits.toFixed(3)}`);
  console.log(`Slice position: ${a.toFixed(3)} (index ${sliceIndex}/${sliceCount - 1})`);

  if (onProgress) {
    onProgress(20, 'Calculating slice...');
  }

  // Collect segments from triangle-plane intersections
  const segments = [];
  for (let i = 0; i < V.length; i += 9) {
    const a0 = new THREE.Vector3(V[i], V[i+1], V[i+2]);
    const a1 = new THREE.Vector3(V[i+3], V[i+4], V[i+5]);
    const a2 = new THREE.Vector3(V[i+6], V[i+7], V[i+8]);
    const seg = triPlaneIntersectSegment(a0, a1, a2, axis, a);
    if (seg) segments.push(seg);
  }
  
  console.log(`Slice ${sliceIndex + 1}: Found ${segments.length} segments at position ${a.toFixed(3)}`);
  
  // If no segments found, let's try a different approach
  if (segments.length === 0) {
    console.log('No segments found, trying alternative approach...');
    // Try with a slightly different plane position
    const altA = a + (a > 0 ? -0.01 : 0.01);
    console.log(`Trying alternative position: ${altA.toFixed(3)}`);
    
    for (let i = 0; i < Math.min(V.length, 1000); i += 9) { // Test first 1000 triangles
      const a0 = new THREE.Vector3(V[i], V[i+1], V[i+2]);
      const a1 = new THREE.Vector3(V[i+3], V[i+4], V[i+5]);
      const a2 = new THREE.Vector3(V[i+6], V[i+7], V[i+8]);
      const seg = triPlaneIntersectSegment(a0, a1, a2, axis, altA);
      if (seg) segments.push(seg);
    }
    console.log(`Alternative approach found ${segments.length} segments`);
  }

  if (onProgress) {
    onProgress(40, 'Processing segments...');
  }

  // Stitch segments into polylines
  const polylines = stitchSegments(segments);

  if (onProgress) {
    onProgress(60, 'Projecting to 2D...');
  }

  // Project to 2D coordinates on the plane (drop the slicing axis)
  const proj = projectPolylinesTo2D(polylines, axis);

  // Compute bounds in model units
  const bounds = bounds2D(proj);
  // Convert to centimeters (since we'll scale to paper via cm → points)
  // 1 OBJ unit = cmPerUnit centimeters
  const widthCm  = (bounds.maxX - bounds.minX) * cmPerUnit;
  const heightCm = (bounds.maxY - bounds.minY) * cmPerUnit;

  // Page layout in points
  const marginPt = marginCm * PT_PER_CM;
  const availW = A4.wPt - 2 * marginPt;
  const availH = A4.hPt - 2 * marginPt;

  // Scale factor from model centimeters to PDF points
  // model cm → points: cm * 72/2.54
  const scale = Math.min(
    availW / (widthCm * PT_PER_CM),
    availH / (heightCm * PT_PER_CM)
  );

  if (onProgress) {
    onProgress(80, 'Generating PDF...');
  }

  // jsPDF in points
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

  // Title
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Slice ${sliceIndex + 1} / ${sliceCount} — axis ${axis} (${panelThicknessCm}cm panels, model height: ${actualModelHeightCm.toFixed(1)} cm, scale 1:${(1/scale).toFixed(2)} cm→pt)`, marginPt, marginPt - 6);

  // Registration marks (small crosses at page corners)
  drawRegistrationMarks(pdf, A4.wPt, A4.hPt, marginPt);

  // Draw outlines with thick, dark lines
  pdf.setLineWidth(2.0); // Thicker lines for better visibility
  pdf.setDrawColor(0, 0, 0); // Pure black

  // Transform: move origin to margin, then translate by -bounds.min to start at (0,0), then scale and cm→pt
  const cmToPt = PT_PER_CM;
  const k = scale * cmToPt * cmPerUnit;
  
  // Only draw if we have valid bounds and scale
  if (isFinite(k) && k > 0 && bounds.maxX > bounds.minX && bounds.maxY > bounds.minY) {
    for (const pl of proj) {
      if (pl.length < 2) continue;
      
      // Draw each line segment individually to avoid jsPDF scale issues
      for (let i = 0; i < pl.length; i++) {
        const [x1, y1] = mapPoint(pl[i], bounds.minX, bounds.minY, marginPt, k);
        const [x2, y2] = mapPoint(pl[(i + 1) % pl.length], bounds.minX, bounds.minY, marginPt, k);
        
        // Only draw if coordinates are valid
        if (isFinite(x1) && isFinite(y1) && isFinite(x2) && isFinite(y2)) {
          pdf.line(x1, y1, x2, y2);
        }
      }
    }
  } else if (proj.length === 0) {
    // Fallback: draw a test cross if no geometry found
    console.log('No geometry found, drawing test cross');
    const centerX = A4.wPt / 2;
    const centerY = A4.hPt / 2;
    const size = 50;
    pdf.line(centerX - size, centerY, centerX + size, centerY);
    pdf.line(centerX, centerY - size, centerX, centerY + size);
    pdf.setFontSize(12);
    pdf.text('No cross-section found at this position', centerX - 60, centerY + 20);
  }

  // Slice label box (bottom-left)
  pdf.setFontSize(12);
  pdf.text(`SLICE ${sliceIndex + 1}`, marginPt, A4.hPt - marginPt + 12);

  if (onProgress) {
    onProgress(90, 'Finalizing PDF...');
  }

  return pdf.output('blob');
}

// Triangle-plane intersection producing a segment on the slicing plane (returns [p,q] in 3D) or null.
function triPlaneIntersectSegment(p0, p1, p2, axis, a){
  const idx = axisToIndex(axis);
  const d0 = p0.getComponent(idx) - a;
  const d1 = p1.getComponent(idx) - a;
  const d2 = p2.getComponent(idx) - a;

  const side = (v)=> (v>eps?1:(v<-eps?-1:0));
  const s0 = side(d0), s1 = side(d1), s2 = side(d2);

  // If all same side or all exactly on plane (coplanar): skip coplanars here for simplicity
  if ((s0>=0 && s1>=0 && s2>=0) || (s0<=0 && s1<=0 && s2<=0)) return null;

  // Edges that cross the plane: we'll find up to 2 intersections
  const inters = [];
  function edgeIntersect(a0, a1, d0, d1){
    const denom = (d1 - d0);
    if (Math.abs(denom) < eps) return null;
    const t = -d0 / denom;
    if (t < -eps || t > 1+eps) return null;
    return new THREE.Vector3().copy(a0).lerp(a1, t);
  }
  const e01 = edgeIntersect(p0, p1, d0, d1); if (e01) inters.push(e01);
  const e12 = edgeIntersect(p1, p2, d1, d2); if (e12) inters.push(e12);
  const e20 = edgeIntersect(p2, p0, d2, d0); if (e20) inters.push(e20);

  if (inters.length === 2) return [inters[0], inters[1]];
  return null;
}

// Stitch small segments into polylines (improved version)
function stitchSegments(segments){
  if (!segments.length) return [];
  
  console.log(`Stitching ${segments.length} segments into polylines...`);
  
  // Map endpoints to segments with more tolerance for floating point errors
  const tolerance = 1e-4;
  const key = (v)=> `${Math.round(v.x/tolerance)}_${Math.round(v.y/tolerance)}_${Math.round(v.z/tolerance)}`;
  const map = new Map();
  const segList = segments.map(([a,b]) => ({ a, b }));
  
  for (const seg of segList){
    const ka = key(seg.a), kb = key(seg.b);
    if (!map.has(ka)) map.set(ka, []);
    if (!map.has(kb)) map.set(kb, []);
    map.get(ka).push({ seg, end:'a' });
    map.get(kb).push({ seg, end:'b' });
  }

  const used = new Set();
  const polylines = [];

  function endpoint(v){ return key(v); }

  for (let i=0;i<segList.length;i++){
    if (used.has(i)) continue;
    
    // Start building a polyline from this segment
    const polyline = [];
    let currentSeg = segList[i];
    let currentEnd = 'b'; // Start from the 'b' end
    used.add(i);
    
    // Add the first segment to the polyline
    polyline.push(currentSeg.a.clone());
    polyline.push(currentSeg.b.clone());
    
    // Try to extend the polyline
    let extended = true;
    while (extended) {
      extended = false;
      
      // Find segments connected to the current end
      const currentPoint = currentEnd === 'a' ? currentSeg.a : currentSeg.b;
      const k = endpoint(currentPoint);
      const connected = map.get(k) || [];
      
      for (const item of connected) {
        const j = segList.indexOf(item.seg);
        if (used.has(j)) continue;
        
        // Found a connected segment
        used.add(j);
        currentSeg = item.seg;
        
        // Add the new point to the polyline
        const newPoint = (item.end === 'a') ? currentSeg.b : currentSeg.a;
        polyline.push(newPoint.clone());
        
        // Update current end
        currentEnd = (item.end === 'a') ? 'b' : 'a';
        extended = true;
        break;
      }
    }
    
    // Try to extend from the other end
    currentSeg = segList[i];
    currentEnd = 'a';
    extended = true;
    while (extended) {
      extended = false;
      
      const currentPoint = currentEnd === 'a' ? currentSeg.a : currentSeg.b;
      const k = endpoint(currentPoint);
      const connected = map.get(k) || [];
      
      for (const item of connected) {
        const j = segList.indexOf(item.seg);
        if (used.has(j)) continue;
        
        used.add(j);
        currentSeg = item.seg;
        
        // Add the new point to the beginning of the polyline
        const newPoint = (item.end === 'a') ? currentSeg.b : currentSeg.a;
        polyline.unshift(newPoint.clone());
        
        currentEnd = (item.end === 'a') ? 'b' : 'a';
        extended = true;
        break;
      }
    }
    
    polylines.push(polyline);
  }
  
  console.log(`Created ${polylines.length} polylines`);
  return polylines;
}

function projectPolylinesTo2D(polylines, axis){
  const out = [];
  const i = axisToIndex(axis);
  const axes2D = [0,1,2].filter(x=>x!==i); // the two surviving axes
  for (const seg of polylines){
    const arr = [];
    for (const v of seg){
      arr.push([ v.getComponent(axes2D[0]), v.getComponent(axes2D[1]) ]);
    }
    out.push(arr);
  }
  return out;
}

function bounds2D(polys){
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for (const pl of polys){
    for (const [x,y] of pl){
      if (x<minX) minX=x;
      if (y<minY) minY=y;
      if (x>maxX) maxX=x;
      if (y>maxY) maxY=y;
    }
  }
  if (!polys.length){ minX=minY=0; maxX=maxY=0; }
  return { minX, minY, maxX, maxY };
}


function mapPoint(p, minX, minY, marginPt, k){
  // p in model OBJ units (on the 2D projected axes)
  const xPt = marginPt + (p[0] - minX) * k;
  // flip Y so it's conventional up on paper (optional)
  const yPt = (/*top down?*/ (marginPt) + (p[1] - minY) * k);
  return [xPt, yPt];
}

function dist2(a,b){
  const dx=a[0]-b[0], dy=a[1]-b[1];
  return dx*dx+dy*dy;
}

function drawRegistrationMarks(pdf, W, H, margin){
  const L = 10; // length in pt
  pdf.setLineWidth(0.5);
  // top-left
  pdf.line(margin, margin - L, margin, margin + L);
  pdf.line(margin - L, margin, margin + L, margin);
  // top-right
  pdf.line(W - margin, margin - L, W - margin, margin + L);
  pdf.line(W - margin - L, margin, W - margin + L, margin);
  // bottom-left
  pdf.line(margin, H - margin - L, margin, H - margin + L);
  pdf.line(margin - L, H - margin, margin + L, H - margin);
  // bottom-right
  pdf.line(W - margin, H - margin - L, W - margin, H - margin + L);
  pdf.line(W - margin - L, H - margin, W - margin + L, H - margin);
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 4000);
}

// Convert Three.js BufferGeometry to OBJ format
function geometryToOBJ(geometry) {
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  
  if (!positions) {
    throw new Error('Geometry has no position attribute');
  }
  
  let objContent = '# Modified OBJ file exported from slicer\n';
  objContent += `# Generated on ${new Date().toISOString()}\n`;
  objContent += `# Vertices: ${positions.count}\n\n`;
  
  // Write vertices
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    objContent += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
  }
  
  // Write normals if available
  if (normals) {
    objContent += '\n';
    for (let i = 0; i < normals.count; i++) {
      const nx = normals.getX(i);
      const ny = normals.getY(i);
      const nz = normals.getZ(i);
      objContent += `vn ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}\n`;
    }
  }
  
  // Write faces (assuming triangles)
  objContent += '\n';
  objContent += 'g default\n';
  
  for (let i = 0; i < positions.count; i += 3) {
    const v1 = i + 1; // OBJ indices are 1-based
    const v2 = i + 2;
    const v3 = i + 3;
    
    if (normals) {
      objContent += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
    } else {
      objContent += `f ${v1} ${v2} ${v3}\n`;
    }
  }
  
  return objContent;
}

// Generate front view image with all Z-level cross-sections stacked
function generateFrontViewGridImage() {
  if (!geom) throw new Error('No geometry loaded');
  
  // Get model bounds
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  
  // Calculate block depth in OBJ units
  const blockDepthUnits = blockDepthCm / cmPerUnit; // 5cm in OBJ units
  
  // Calculate how many Z-levels we need
  const modelDepth = box.max.z - box.min.z;
  const numLevels = Math.max(1, Math.ceil(modelDepth / blockDepthUnits));
  
  // Create canvas for the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = 2400; // Very high resolution image
  canvas.width = size;
  canvas.height = size;
  
  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);
  
  // Calculate model bounds in 2D (X and Y axes)
  const modelWidth = box.max.x - box.min.x;
  const modelHeight = box.max.y - box.min.y;
  const modelCenterX = (box.max.x + box.min.x) / 2;
  const modelCenterY = (box.max.y + box.min.y) / 2;
  
  // Calculate scale to fit model in canvas with some margin
  const margin = 0.1; // 10% margin
  const scale = Math.min(
    (size * (1 - 2 * margin)) / modelWidth,
    (size * (1 - 2 * margin)) / modelHeight
  );
  
  const offsetX = size / 2 - modelCenterX * scale;
  const offsetY = size / 2 - modelCenterY * scale;
  
  // Get geometry for outline extraction
  let currentGeom = geom;
  if (blockMode && blocks.length > 0) {
    const visibleBlocks = blocks.filter(block => block.visible);
    if (visibleBlocks.length > 0) {
      const mergedGeom = mergeBlockGeometries(visibleBlocks);
      if (mergedGeom) {
        currentGeom = mergedGeom;
      }
    }
  }
  
  // Draw block grid overlay first (so it's behind the cross-sections)
  drawBlockGrid(ctx, box, offsetX, offsetY, scale);
  
  // First draw intermediate cross-sections (dashed lines)
  const intermediateDepthUnits = 2.5 / cmPerUnit; // 2.5cm in OBJ units
  const numIntermediateLevels = Math.max(1, Math.ceil(modelDepth / intermediateDepthUnits));
  
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (let level = 0; level < numIntermediateLevels; level++) {
    const z = box.min.z + (level + 0.5) * intermediateDepthUnits;
    
    // Skip if this Z level is already covered by a main cross-section
    const isMainLevel = Math.abs((z - box.min.z) % blockDepthUnits - blockDepthUnits/2) < 0.001;
    if (isMainLevel) continue;
    
    const crossSection = extractCrossSectionAtZ(currentGeom, z);
    
    if (crossSection.length > 0) {
      // Draw each polyline separately
      for (const polyline of crossSection) {
        if (polyline.length >= 2) {
          ctx.beginPath();
          for (let i = 0; i < polyline.length; i++) {
            const canvasX = offsetX + polyline[i].x * scale;
            const canvasY = offsetY + (box.max.y - polyline[i].y) * scale; // Flip Y axis
            
            if (i === 0) {
              ctx.moveTo(canvasX, canvasY);
            } else {
              ctx.lineTo(canvasX, canvasY);
            }
          }
          ctx.stroke();
        }
      }
    }
  }
  
  // Then draw main cross-sections (solid lines)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  
  for (let level = 0; level < numLevels; level++) {
    const z = box.min.z + (level + 0.5) * blockDepthUnits; // Center of each level
    
    // Extract cross-section at this Z level
    const crossSection = extractCrossSectionAtZ(currentGeom, z);
    
    if (crossSection.length > 0) {
      // Draw each polyline separately
      for (const polyline of crossSection) {
        if (polyline.length >= 2) {
          ctx.beginPath();
          for (let i = 0; i < polyline.length; i++) {
            const canvasX = offsetX + polyline[i].x * scale;
            const canvasY = offsetY + (box.max.y - polyline[i].y) * scale; // Flip Y axis
            
            if (i === 0) {
              ctx.moveTo(canvasX, canvasY);
            } else {
              ctx.lineTo(canvasX, canvasY);
            }
          }
          ctx.stroke();
        }
      }
      
      // Add Z-level label
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      
      // Find a good position for the label (top-right of the outline)
      let maxX = -Infinity;
      let minY = Infinity;
      for (const polyline of crossSection) {
        for (const point of polyline) {
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
        }
      }
      if (maxX !== -Infinity && minY !== Infinity) {
        const labelX = offsetX + maxX * scale + 5;
        const labelY = offsetY + (box.max.y - minY) * scale - 5; // Flip Y axis
        ctx.fillText(`${(z * cmPerUnit).toFixed(1)}cm`, labelX, labelY);
      }
    }
  }
  
  // Draw the outer boundary (Z=0 level)
  ctx.strokeStyle = '#ff0000'; // Red for the outer boundary
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 6]); // Dotted line for the boundary
  
  const outerBoundary = extractOuterBoundary(currentGeom, box);
  if (outerBoundary.length > 0) {
    ctx.beginPath();
    for (let i = 0; i < outerBoundary.length; i++) {
      const canvasX = offsetX + outerBoundary[i].x * scale;
      const canvasY = offsetY + (box.max.y - outerBoundary[i].y) * scale; // Flip Y axis
      
      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    ctx.stroke();
  }
  
  // Reset line style
  ctx.setLineDash([]);
  
  // Add title and info
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Stacked Cross-Sections View', size / 2, 30);
  
  ctx.font = '12px Arial';
  ctx.fillText(`Main levels: ${numLevels} | Intermediate: ${numIntermediateLevels - numLevels} | Block depth: ${blockDepthCm}cm | Model depth: ${(modelDepth * cmPerUnit).toFixed(1)}cm`, size / 2, 50);
  ctx.fillText(`Black lines = Main (5cm) | Gray lines = Intermediate (2.5cm) | Red = Outer boundary`, size / 2, 65);
  
  return canvas.toDataURL('image/png');
}

// Extract cross-section at a specific Z level
function extractCrossSectionAtZ(geometry, z) {
  const pos = geometry.getAttribute('position');
  const V = pos.array;
  const segments = [];
  
  // Find triangle-plane intersections at this Z level
  for (let i = 0; i < V.length; i += 9) {
    const v0 = new THREE.Vector3(V[i], V[i+1], V[i+2]);
    const v1 = new THREE.Vector3(V[i+3], V[i+4], V[i+5]);
    const v2 = new THREE.Vector3(V[i+6], V[i+7], V[i+8]);
    
    const seg = triPlaneIntersectSegment(v0, v1, v2, 'Z', z);
    if (seg) segments.push(seg);
  }
  
  // Stitch segments into polylines
  const polylines = stitchSegments(segments);
  
  // Project to 2D (X-Y plane) and return as separate polylines
  const crossSection = [];
  for (const polyline of polylines) {
    if (polyline.length >= 2) {
      const projected = [];
      for (const point of polyline) {
        projected.push({ x: point.x, y: point.y });
      }
      crossSection.push(projected);
    }
  }
  
  return crossSection;
}

// Draw block grid overlay (green chessboard pattern)
function drawBlockGrid(ctx, box, offsetX, offsetY, scale) {
  // Calculate block dimensions in OBJ units
  const blockSizeUnits = {
    x: blockWidthCm / cmPerUnit,  // 1m in OBJ units
    y: blockHeightCm / cmPerUnit, // 0.5m in OBJ units
  };
  
  // Calculate total block area
  const totalBlockSizeUnits = {
    x: Math.ceil((box.max.x - box.min.x) / blockSizeUnits.x) * blockSizeUnits.x,
    y: Math.ceil((box.max.y - box.min.y) / blockSizeUnits.y) * blockSizeUnits.y,
  };
  
  // Calculate offset to center the blocks around the model
  const blockOffset = {
    x: (box.max.x - box.min.x - totalBlockSizeUnits.x) / 2,
    y: (box.max.y - box.min.y - totalBlockSizeUnits.y) / 2,
  };
  
  // Set grid style
  ctx.strokeStyle = '#00ff00'; // Green color
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]); // Dashed lines
  ctx.globalAlpha = 0.6; // Semi-transparent
  
  // Draw vertical grid lines (X direction)
  for (let i = 0; i <= Math.ceil(totalBlockSizeUnits.x / blockSizeUnits.x); i++) {
    const x = box.min.x + blockOffset.x + (i * blockSizeUnits.x);
    const canvasX = offsetX + x * scale;
    const canvasY1 = offsetY + (box.max.y - box.min.y - blockOffset.y) * scale;
    const canvasY2 = offsetY + blockOffset.y * scale;
    
    ctx.beginPath();
    ctx.moveTo(canvasX, canvasY1);
    ctx.lineTo(canvasX, canvasY2);
    ctx.stroke();
  }
  
  // Draw horizontal grid lines (Y direction)
  for (let i = 0; i <= Math.ceil(totalBlockSizeUnits.y / blockSizeUnits.y); i++) {
    const y = box.min.y + blockOffset.y + (i * blockSizeUnits.y);
    const canvasY = offsetY + (box.max.y - y) * scale; // Flip Y axis
    const canvasX1 = offsetX + (box.min.x + blockOffset.x) * scale;
    const canvasX2 = offsetX + (box.min.x + blockOffset.x + totalBlockSizeUnits.x) * scale;
    
    ctx.beginPath();
    ctx.moveTo(canvasX1, canvasY);
    ctx.lineTo(canvasX2, canvasY);
    ctx.stroke();
  }
  
  // Reset line style
  ctx.setLineDash([]);
  ctx.globalAlpha = 1.0;
  
  // Add block labels at intersections
  ctx.fillStyle = '#00aa00'; // Darker green for text
  ctx.font = '8px Arial';
  ctx.textAlign = 'center';
  
  // Label every other intersection to avoid clutter
  for (let y = 0; y <= Math.ceil(totalBlockSizeUnits.y / blockSizeUnits.y); y += 2) {
    for (let x = 0; x <= Math.ceil(totalBlockSizeUnits.x / blockSizeUnits.x); x += 2) {
      const gridX = box.min.x + blockOffset.x + (x * blockSizeUnits.x);
      const gridY = box.min.y + blockOffset.y + (y * blockSizeUnits.y);
      const canvasX = offsetX + gridX * scale;
      const canvasY = offsetY + (box.max.y - gridY) * scale; // Flip Y axis
      
      ctx.fillText(`${x},${y}`, canvasX, canvasY - 2);
    }
  }
}

// Extract outer boundary (Z=0 level)
function extractOuterBoundary(geometry, boundingBox) {
  const pos = geometry.getAttribute('position');
  const V = pos.array;
  const edgePoints = [];
  const tolerance = 0.01;
  
  // Find points on the front face (minimum Z)
  for (let i = 0; i < V.length; i += 9) {
    const v0 = new THREE.Vector3(V[i], V[i+1], V[i+2]);
    const v1 = new THREE.Vector3(V[i+3], V[i+4], V[i+5]);
    const v2 = new THREE.Vector3(V[i+6], V[i+7], V[i+8]);
    
    // Check if any vertex is on the front face
    if (Math.abs(v0.z - boundingBox.min.z) < tolerance) {
      edgePoints.push({ x: v0.x, y: v0.y });
    }
    if (Math.abs(v1.z - boundingBox.min.z) < tolerance) {
      edgePoints.push({ x: v1.x, y: v1.y });
    }
    if (Math.abs(v2.z - boundingBox.min.z) < tolerance) {
      edgePoints.push({ x: v2.x, y: v2.y });
    }
  }
  
  // Connect edge points to form boundary
  return connectEdgePoints(edgePoints);
}

// Extract outlines from front view (X-Y plane)
function extractFrontViewOutlines(geometry, boundingBox) {
  const pos = geometry.getAttribute('position');
  const V = pos.array;
  
  // Create a 2D projection of the model
  const projectedPoints = [];
  
  for (let i = 0; i < V.length; i += 9) {
    const v0 = new THREE.Vector3(V[i], V[i+1], V[i+2]);
    const v1 = new THREE.Vector3(V[i+3], V[i+4], V[i+5]);
    const v2 = new THREE.Vector3(V[i+6], V[i+7], V[i+8]);
    
    // Project to 2D (front view - keep X and Y, ignore Z)
    projectedPoints.push(
      { x: v0.x, y: v0.y, z: v0.z },
      { x: v1.x, y: v1.y, z: v1.z },
      { x: v2.x, y: v2.y, z: v2.z }
    );
  }
  
  // Find edge points (points that are on the boundary)
  const edgePoints = findEdgePoints(projectedPoints, boundingBox);
  
  // Connect edge points to form outlines
  const outlines = connectEdgePoints(edgePoints);
  
  return outlines;
}

// Find points that are on the edge of the model
function findEdgePoints(points, boundingBox) {
  const edgePoints = [];
  const tolerance = 0.01; // Small tolerance for edge detection
  
  for (const point of points) {
    // Check if point is near the front face (minimum Z)
    if (Math.abs(point.z - boundingBox.min.z) < tolerance) {
      edgePoints.push({ x: point.x, y: point.y });
    }
  }
  
  return edgePoints;
}

// Connect edge points to form continuous outlines
function connectEdgePoints(edgePoints) {
  if (edgePoints.length < 3) return [];
  
  const outlines = [];
  const used = new Set();
  const tolerance = 0.01;
  
  function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }
  
  for (let i = 0; i < edgePoints.length; i++) {
    if (used.has(i)) continue;
    
    const outline = [edgePoints[i]];
    used.add(i);
    let currentPoint = edgePoints[i];
    
    // Try to find connected points
    let found = true;
    while (found) {
      found = false;
      let closestIndex = -1;
      let closestDistance = Infinity;
      
      for (let j = 0; j < edgePoints.length; j++) {
        if (used.has(j)) continue;
        
        const dist = distance(currentPoint, edgePoints[j]);
        if (dist < tolerance && dist < closestDistance) {
          closestIndex = j;
          closestDistance = dist;
          found = true;
        }
      }
      
      if (found) {
        outline.push(edgePoints[closestIndex]);
        used.add(closestIndex);
        currentPoint = edgePoints[closestIndex];
      }
    }
    
    if (outline.length >= 3) {
      outlines.push(outline);
    }
  }
  
  return outlines;
}

// Front View Grid Modal
let frontViewModal = null;
let frontViewCanvas = null;
let frontViewCtx = null;
let currentPanelData = null;

// Open front view grid modal
function openFrontViewGrid() {
  if (!geom) return;
  
  // Create modal if it doesn't exist
  if (!frontViewModal) {
    createFrontViewModal();
  }
  
  // Show modal
  frontViewModal.style.display = 'block';
  
  // Generate the front view
  generateFrontViewForModal();
}

// Create front view modal
function createFrontViewModal() {
  // Create modal HTML
  const modalHTML = `
    <div id="frontViewModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Front View Grid - Click on a Panel</h2>
          <span class="close" id="closeFrontViewModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="controls-section">
            <div style="margin-bottom: 15px; text-align: center;">
              <label for="panelXInput" style="margin-right: 10px;">Panel X:</label>
              <input type="number" id="panelXInput" value="0" min="0" style="width: 60px; margin-right: 15px; padding: 5px;">
              <label for="panelYInput" style="margin-right: 10px;">Panel Y:</label>
              <input type="number" id="panelYInput" value="0" min="0" style="width: 60px; margin-right: 15px; padding: 5px;">
              <button id="openPanelBtn" style="padding: 5px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Open Panel Detail</button>
            </div>
            <div class="control-buttons" style="text-align: center;">
              <button id="downloadFrontViewBtn" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Download Front View</button>
            </div>
          </div>
          <div class="canvas-container">
            <canvas id="frontViewCanvas" width="1200" height="1200"></canvas>
          </div>
          <div style="margin-top: 10px; text-align: center; color: #666; font-size: 12px;">
            Enter panel coordinates above to view detailed cross-sections
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Get references
  frontViewModal = document.getElementById('frontViewModal');
  frontViewCanvas = document.getElementById('frontViewCanvas');
  frontViewCtx = frontViewCanvas.getContext('2d');
  
  // Add event listeners
  document.getElementById('closeFrontViewModal').addEventListener('click', () => {
    frontViewModal.style.display = 'none';
  });
  
  frontViewModal.addEventListener('click', (e) => {
    if (e.target === frontViewModal) {
      frontViewModal.style.display = 'none';
    }
  });
  
  // Add event listener for Open Panel Detail button
  document.getElementById('openPanelBtn').addEventListener('click', () => {
    const panelX = parseInt(document.getElementById('panelXInput').value) || 0;
    const panelY = parseInt(document.getElementById('panelYInput').value) || 0;
    
    console.log(`Opening panel (${panelX}, ${panelY})`);
    
    // Get the current geometry and bounding box
    if (!geom) {
      console.error('No geometry loaded');
      return;
    }
    
    // Calculate bounding box
    geom.computeBoundingBox();
    const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
    
    // Get current geometry (merged blocks if in block mode)
    let currentGeom = geom;
    if (blockMode && blocks.length > 0) {
      const visibleBlocks = blocks.filter(block => block.visible);
      if (visibleBlocks.length > 0) {
        const mergedGeom = mergeBlockGeometries(visibleBlocks);
        if (mergedGeom) {
          currentGeom = mergedGeom;
        }
      }
    }
    
    openPanelDetailModal({ x: panelX, y: panelY }, box, currentGeom);
  });
  
  // Add event listener for Download Front View button
  document.getElementById('downloadFrontViewBtn').addEventListener('click', () => {
    try {
      const link = document.createElement('a');
      link.download = 'front_view_grid.png';
      link.href = frontViewCanvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error downloading front view:', error);
    }
  });
  
  // Add click event listener to canvas (only once)
  frontViewCanvas.addEventListener('click', (event) => {
    if (!window.frontViewClickData) {
      console.log('Front view click data not available');
      return;
    }
    
    const rect = frontViewCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Find clicked panel
    const { box, offsetX, offsetY, scale, blockSizeUnits, blockOffset, currentGeom } = window.frontViewClickData;
    const clickedPanel = findClickedPanel(clickX, clickY, box, offsetX, offsetY, scale, blockSizeUnits, blockOffset);
    
    if (clickedPanel) {
      console.log('Panel found:', clickedPanel.x + ',' + clickedPanel.y);
      openPanelDetailModal(clickedPanel, box, currentGeom);
    } else {
      console.log('No panel found at click location');
    }
  });
}

// Generate front view for modal
function generateFrontViewForModal() {
  if (!frontViewCtx || !geom) return;
  
  const box = geom.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geom.getAttribute('position'));
  const blockDepthUnits = blockDepthCm / cmPerUnit;
  const modelDepth = box.max.z - box.min.z;
  const numLevels = Math.max(1, Math.ceil(modelDepth / blockDepthUnits));
  
  const size = 1200;
  frontViewCanvas.width = size;
  frontViewCanvas.height = size;
  
  // Clear canvas
  frontViewCtx.fillStyle = 'white';
  frontViewCtx.fillRect(0, 0, size, size);
  
  // Calculate model bounds
  const modelWidth = box.max.x - box.min.x;
  const modelHeight = box.max.y - box.min.y;
  const modelCenterX = (box.max.x + box.min.x) / 2;
  const modelCenterY = (box.max.y + box.min.y) / 2;
  
  const margin = 0.1;
  const scale = Math.min(
    (size * (1 - 2 * margin)) / modelWidth,
    (size * (1 - 2 * margin)) / modelHeight
  );
  
  const offsetX = size / 2 - modelCenterX * scale;
  const offsetY = size / 2 - modelCenterY * scale;
  
  // Get geometry for outline extraction
  let currentGeom = geom;
  if (blockMode && blocks.length > 0) {
    const visibleBlocks = blocks.filter(block => block.visible);
    if (visibleBlocks.length > 0) {
      const mergedGeom = mergeBlockGeometries(visibleBlocks);
      if (mergedGeom) {
        currentGeom = mergedGeom;
      }
    }
  }
  
  // Draw block grid overlay
  drawClickableBlockGrid(frontViewCtx, box, offsetX, offsetY, scale, currentGeom);
  
  // Draw cross-sections
  drawFrontViewCrossSections(frontViewCtx, currentGeom, box, offsetX, offsetY, scale);
  
  // Add title
  frontViewCtx.fillStyle = '#000000';
  frontViewCtx.font = 'bold 16px Arial';
  frontViewCtx.textAlign = 'center';
  frontViewCtx.fillText('Front View Grid - Click on a Panel', size / 2, 30);
}

// Draw clickable block grid
function drawClickableBlockGrid(ctx, box, offsetX, offsetY, scale, currentGeom) {
  const blockSizeUnits = {
    x: blockWidthCm / cmPerUnit,
    y: blockHeightCm / cmPerUnit,
  };

  const totalBlockSizeUnits = {
    x: Math.ceil((box.max.x - box.min.x) / blockSizeUnits.x) * blockSizeUnits.x,
    y: Math.ceil((box.max.y - box.min.y) / blockSizeUnits.y) * blockSizeUnits.y,
  };

  const blockOffset = {
    x: (box.max.x - box.min.x - totalBlockSizeUnits.x) / 2,
    y: (box.max.y - box.min.y - totalBlockSizeUnits.y) / 2,
  };

  // Draw panel rectangles
  const numPanelsX = Math.ceil(totalBlockSizeUnits.x / blockSizeUnits.x);
  const numPanelsY = Math.ceil(totalBlockSizeUnits.y / blockSizeUnits.y);
  
  for (let y = 0; y < numPanelsY; y++) {
    for (let x = 0; x < numPanelsX; x++) {
      const panelX = box.min.x + blockOffset.x + (x * blockSizeUnits.x);
      const panelY = box.min.y + blockOffset.y + (y * blockSizeUnits.y);
      
      const canvasX = offsetX + panelX * scale;
      const canvasY = offsetY + (box.max.y - panelY - blockSizeUnits.y) * scale;
      const canvasWidth = blockSizeUnits.x * scale;
      const canvasHeight = blockSizeUnits.y * scale;
      
      // Draw panel rectangle
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
      
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
      
      // Add panel label
      ctx.fillStyle = '#00aa00';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${x},${y}`, canvasX + canvasWidth/2, canvasY + canvasHeight/2);
      
      // Debug: draw panel coordinates in corner
      ctx.fillStyle = '#ff0000';
      ctx.font = '8px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`(${x},${y})`, canvasX + 2, canvasY + 10);
    }
  }
  
  // Store variables for click handling (will be used by the click listener)
  window.frontViewClickData = {
    box: box,
    offsetX: offsetX,
    offsetY: offsetY,
    scale: scale,
    blockSizeUnits: blockSizeUnits,
    blockOffset: blockOffset,
    currentGeom: currentGeom
  };
}

// Find clicked panel
function findClickedPanel(clickX, clickY, box, offsetX, offsetY, scale, blockSizeUnits, blockOffset) {
  console.log('=== CLICK DETECTION DEBUG ===');
  console.log('Click coordinates:', clickX, clickY);
  console.log('Box bounds:', box.min.x, box.min.y, box.max.x, box.max.y);
  console.log('Block offset:', blockOffset);
  console.log('Block size units:', blockSizeUnits);
  
  // Calculate total number of panels (same as drawing code)
  const totalBlockSizeUnits = {
    x: Math.ceil((box.max.x - box.min.x) / blockSizeUnits.x) * blockSizeUnits.x,
    y: Math.ceil((box.max.y - box.min.y) / blockSizeUnits.y) * blockSizeUnits.y,
  };
  
  const numPanelsX = Math.ceil(totalBlockSizeUnits.x / blockSizeUnits.x);
  const numPanelsY = Math.ceil(totalBlockSizeUnits.y / blockSizeUnits.y);
  
  console.log('Total panels:', numPanelsX, numPanelsY);
  
  // Convert click coordinates to model coordinates
  const modelX = (clickX - offsetX) / scale;
  const modelY = box.max.y - (clickY - offsetY) / scale; // Flip Y axis
  
  console.log('Model coordinates:', modelX, modelY);
  
  // Calculate panel start position (same as drawing code)
  const panelStartX = box.min.x + blockOffset.x;
  const panelStartY = box.min.y + blockOffset.y;
  
  console.log('Panel start position:', panelStartX, panelStartY);
  
  // Calculate which panel the click is in by iterating through all panels
  // This matches exactly how the panels are drawn
  for (let y = 0; y < numPanelsY; y++) {
    for (let x = 0; x < numPanelsX; x++) {
      const panelX = panelStartX + (x * blockSizeUnits.x);
      const panelY = panelStartY + (y * blockSizeUnits.y);
      
      // Check if click is within this panel's bounds
      if (modelX >= panelX && modelX < panelX + blockSizeUnits.x &&
          modelY >= panelY && modelY < panelY + blockSizeUnits.y) {
        console.log(`Found panel at (${x},${y})`);
        console.log(`Panel bounds: x=${panelX} to ${panelX + blockSizeUnits.x}, y=${panelY} to ${panelY + blockSizeUnits.y}`);
        return { x: x, y: y };
      }
    }
  }
  
  console.log('No panel found for click');
  return null;
}

// Draw front view cross-sections
function drawFrontViewCrossSections(ctx, geometry, box, offsetX, offsetY, scale) {
  // Draw main cross-sections
  const blockDepthUnits = blockDepthCm / cmPerUnit;
  const modelDepth = box.max.z - box.min.z;
  const numLevels = Math.max(1, Math.ceil(modelDepth / blockDepthUnits));
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (let level = 0; level < numLevels; level++) {
    const z = box.min.z + (level + 0.5) * blockDepthUnits;
    const crossSection = extractCrossSectionAtZ(geometry, z);
    
    if (crossSection.length > 0) {
      for (const polyline of crossSection) {
        if (polyline.length >= 2) {
          ctx.beginPath();
          for (let i = 0; i < polyline.length; i++) {
            const canvasX = offsetX + polyline[i].x * scale;
            const canvasY = offsetY + (box.max.y - polyline[i].y) * scale;
            
            if (i === 0) {
              ctx.moveTo(canvasX, canvasY);
            } else {
              ctx.lineTo(canvasX, canvasY);
            }
          }
          ctx.stroke();
        }
      }
    }
  }
}

// Open panel detail modal
function openPanelDetailModal(panel, box, geometry) {
  console.log('openPanelDetailModal called with panel:', panel);
  currentPanelData = { panel, box, geometry };
  
  // Show panel detail modal
  const panelModal = document.getElementById('panelDetailModal');
  console.log('Panel modal element:', panelModal);
  if (panelModal) {
    panelModal.style.display = 'block';
    console.log('Panel modal should be visible now');
  } else {
    console.error('Panel modal element not found!');
  }
  
  // Setup panel modal events
  setupPanelModalEvents(panel, box, geometry);
  
  // Draw initial panel view
  drawPanelView(panel, box, geometry);
}

// Setup panel modal events
function setupPanelModalEvents(panel, box, geometry) {
  const panelZSlider = document.getElementById('panelZSlider');
  const panelZValue = document.getElementById('panelZValue');
  const showAllPanelLevelsBtn = document.getElementById('showAllPanelLevelsBtn');
  const hideAllPanelLevelsBtn = document.getElementById('hideAllPanelLevelsBtn');
  const downloadPanelViewBtn = document.getElementById('downloadPanelViewBtn');
  const closePanelModal = document.getElementById('closePanelModal');
  const panelDetailInfo = document.getElementById('panelDetailInfo');
  
  // Update panel info
  panelDetailInfo.textContent = `Panel (${panel.x}, ${panel.y}) - Black lines = Main (5cm) | Gray lines = Intermediate (2.5cm) | Use slider to view specific levels`;
  
  // Calculate max Z level
  const blockDepthUnits = blockDepthCm / cmPerUnit;
  const modelDepth = box.max.z - box.min.z;
  const maxZLevel = Math.max(1, Math.ceil(modelDepth / blockDepthUnits)) - 1;
  
  panelZSlider.max = maxZLevel;
  panelZSlider.value = maxZLevel;
  panelZValue.textContent = `${(maxZLevel * 5).toFixed(1)}cm`;
  
  // Panel slider events
  panelZSlider.addEventListener('input', () => {
    const level = parseInt(panelZSlider.value);
    panelZValue.textContent = `${(level * 5).toFixed(1)}cm`;
    drawPanelView(panel, box, geometry, level);
  });
  
  // Control buttons
  showAllPanelLevelsBtn.addEventListener('click', () => {
    drawPanelView(panel, box, geometry, -1); // -1 means show all
  });
  
  hideAllPanelLevelsBtn.addEventListener('click', () => {
    drawPanelView(panel, box, geometry, -2); // -2 means hide all
  });
  
  downloadPanelViewBtn.addEventListener('click', () => {
    const imageDataUrl = document.getElementById('panelCanvas').toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `panel_${panel.x}_${panel.y}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.click();
  });
  
  // Close modal
  const panelModal = document.getElementById('panelDetailModal');
  closePanelModal.addEventListener('click', () => {
    panelModal.style.display = 'none';
  });
  
  panelModal.addEventListener('click', (e) => {
    if (e.target === panelModal) {
      panelModal.style.display = 'none';
    }
  });
}

// Draw panel view
function drawPanelView(panel, box, geometry, level = 0) {
  const panelCanvas = document.getElementById('panelCanvas');
  const panelCtx = panelCanvas.getContext('2d');
  
  // Use larger canvas size for better detail
  const size = 1000;
  panelCanvas.width = size;
  panelCanvas.height = size;
  
  // Clear canvas
  panelCtx.fillStyle = 'white';
  panelCtx.fillRect(0, 0, size, size);
  
  // Calculate panel bounds
  const blockSizeUnits = {
    x: blockWidthCm / cmPerUnit,
    y: blockHeightCm / cmPerUnit,
  };
  
  const totalBlockSizeUnits = {
    x: Math.ceil((box.max.x - box.min.x) / blockSizeUnits.x) * blockSizeUnits.x,
    y: Math.ceil((box.max.y - box.min.y) / blockSizeUnits.y) * blockSizeUnits.y,
  };
  
  const blockOffset = {
    x: (box.max.x - box.min.x - totalBlockSizeUnits.x) / 2,
    y: (box.max.y - box.min.y - totalBlockSizeUnits.y) / 2,
  };
  
  const panelX = box.min.x + blockOffset.x + (panel.x * blockSizeUnits.x);
  const panelY = box.min.y + blockOffset.y + (panel.y * blockSizeUnits.y);
  const panelWidth = blockSizeUnits.x;
  const panelHeight = blockSizeUnits.y;
  
  // Calculate scale to fit panel in canvas with minimal margin
  const margin = 0.05; // Reduced margin for more space
  const scale = Math.min(
    (size * (1 - 2 * margin)) / panelWidth,
    (size * (1 - 2 * margin)) / panelHeight
  );
  
  const offsetX = size / 2 - (panelX + panelWidth/2) * scale;
  const offsetY = size / 2 - (box.max.y - panelY - panelHeight/2) * scale;
  
  // Draw panel outline
  panelCtx.strokeStyle = '#00ff00';
  panelCtx.lineWidth = 3;
  panelCtx.strokeRect(
    offsetX + panelX * scale,
    offsetY + (box.max.y - panelY - panelHeight) * scale,
    panelWidth * scale,
    panelHeight * scale
  );
  
  // Draw cross-sections for this panel
  if (level >= 0) {
    // Draw specific level
    const z = box.min.z + (level + 0.5) * (blockDepthCm / cmPerUnit);
    const crossSection = extractCrossSectionAtZ(geometry, z);
    drawPanelCrossSection(panelCtx, crossSection, panelX, panelY, panelWidth, panelHeight, offsetX, offsetY, scale, box, true, '#000000');
  } else if (level === -1) {
    // Draw all levels with different colors
    const blockDepthUnits = blockDepthCm / cmPerUnit;
    const intermediateDepthUnits = 2.5 / cmPerUnit;
    const modelDepth = box.max.z - box.min.z;
    const numLevels = Math.max(1, Math.ceil(modelDepth / blockDepthUnits));
    const numIntermediateLevels = Math.max(1, Math.ceil(modelDepth / intermediateDepthUnits));
    
    // First draw intermediate levels (gray)
    for (let l = 0; l < numIntermediateLevels; l++) {
      const z = box.min.z + (l + 0.5) * intermediateDepthUnits;
      
      // Skip if this Z level is already covered by a main cross-section
      const isMainLevel = Math.abs((z - box.min.z) % blockDepthUnits - blockDepthUnits/2) < 0.001;
      if (isMainLevel) continue;
      
      const crossSection = extractCrossSectionAtZ(geometry, z);
      drawPanelCrossSection(panelCtx, crossSection, panelX, panelY, panelWidth, panelHeight, offsetX, offsetY, scale, box, false, '#888888');
    }
    
    // Then draw main levels (black)
    for (let l = 0; l < numLevels; l++) {
      const z = box.min.z + (l + 0.5) * blockDepthUnits;
      const crossSection = extractCrossSectionAtZ(geometry, z);
      drawPanelCrossSection(panelCtx, crossSection, panelX, panelY, panelWidth, panelHeight, offsetX, offsetY, scale, box, true, '#000000');
    }
  }
  
  // Add title
  panelCtx.fillStyle = '#000000';
  panelCtx.font = 'bold 16px Arial';
  panelCtx.textAlign = 'center';
  panelCtx.fillText(`Panel (${panel.x}, ${panel.y}) Detail View`, size / 2, 30);
}

// Draw cross-section for panel
function drawPanelCrossSection(ctx, crossSection, panelX, panelY, panelWidth, panelHeight, offsetX, offsetY, scale, box, isMain = true, color = null) {
  if (!crossSection || crossSection.length === 0) return;
  
  // Filter cross-section to only include points within the panel bounds
  const panelCrossSection = [];
  for (const polyline of crossSection) {
    const panelPolyline = [];
    for (const point of polyline) {
      if (point.x >= panelX && point.x <= panelX + panelWidth &&
          point.y >= panelY && point.y <= panelY + panelHeight) {
        panelPolyline.push(point);
      }
    }
    if (panelPolyline.length >= 2) {
      panelCrossSection.push(panelPolyline);
    }
  }
  
  if (panelCrossSection.length === 0) return;
  
  // Draw the filtered cross-section
  ctx.strokeStyle = color || (isMain ? '#000000' : '#666666');
  ctx.lineWidth = isMain ? 2 : 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (const polyline of panelCrossSection) {
    if (polyline.length >= 2) {
      ctx.beginPath();
      for (let i = 0; i < polyline.length; i++) {
        const canvasX = offsetX + polyline[i].x * scale;
        const canvasY = offsetY + (box.max.y - polyline[i].y) * scale;
        
        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      }
      ctx.stroke();
    }
  }
}
