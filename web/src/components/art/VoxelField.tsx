import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/cn'

const COUNT = 300
const SPREAD_X = 21
const SPREAD_Z = 7
const GREYS = [0xefeee8, 0xe4e2da, 0xd8d6cd, 0xcbc9bf, 0xbab8ad, 0x111111]
const GREY_WEIGHTS = [0.3, 0.28, 0.2, 0.13, 0.07, 0.02]

/**
 * The hero field: hundreds of small voxels drifting in a shallow band, in
 * paper-and-ink greys, reacting to the pointer. Sparse on purpose — it should
 * read as a pixel cloud behind the copy, not a solid landscape.
 */
export function VoxelField({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200)
    camera.position.set(0, 7.5, 21)
    camera.lookAt(0, 1.1, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 1.15))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9)
    keyLight.position.set(-6, 12, 10)
    scene.add(keyLight)

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 })
    const mesh = new THREE.InstancedMesh(geometry, material, COUNT)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    scene.add(mesh)

    // Deterministic scatter so the field is identical on every mount.
    let seed = 20261117
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }

    const pickGrey = () => {
      const roll = random()
      let cumulative = 0
      for (let index = 0; index < GREYS.length; index += 1) {
        cumulative += GREY_WEIGHTS[index]
        if (roll <= cumulative) return GREYS[index]
      }
      return GREYS[0]
    }

    const particles = Array.from({ length: COUNT }, () => ({
      x: (random() - 0.5) * SPREAD_X * 2,
      z: (random() - 0.5) * SPREAD_Z * 2,
      y: (random() - 0.5) * 2.6,
      size: 0.16 + random() * random() * 0.95,
      spin: random() * Math.PI,
      phase: random() * Math.PI * 2,
      speed: 0.3 + random() * 0.7,
      depth: 0.5 + random() * 0.5,
    }))

    const color = new THREE.Color()
    particles.forEach((particle, index) => {
      color.setHex(pickGrey())
      mesh.setColorAt(index, color)
      void particle
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    const dummy = new THREE.Object3D()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)

    const pointer = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }
    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    }
    window.addEventListener('pointermove', onPointerMove)

    let frameId = 0
    let elapsed = 0
    let lastTime = performance.now()

    const renderFrame = () => {
      frameId = requestAnimationFrame(renderFrame)
      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      if (!reducedMotion) elapsed += delta
      const time = elapsed

      pointer.x += (target.x - pointer.x) * 0.05
      pointer.y += (target.y - pointer.y) * 0.05
      camera.position.x = pointer.x * 1.9
      camera.position.y = 7.5 - pointer.y * 1.4
      camera.lookAt(pointer.x * 0.4, 1.1, 0)

      particles.forEach((particle, index) => {
        const bob = reducedMotion ? 0 : Math.sin(time * particle.speed + particle.phase) * 0.55
        dummy.position.set(particle.x, particle.y + bob, particle.z)
        dummy.rotation.set(0, particle.spin + time * 0.05 * particle.speed, 0)
        dummy.scale.set(particle.size, particle.size * particle.depth, particle.size)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      renderer.render(scene, camera)
    }
    renderFrame()

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={cn(
        'h-full w-full [mask-image:radial-gradient(62%_100%_at_50%_52%,#000_26%,transparent_72%)]',
        className,
      )}
    />
  )
}
