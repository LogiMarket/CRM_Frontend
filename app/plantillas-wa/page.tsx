"use client"

import React from "react"

export default function PlantillasWAPage() {
  // Aquí irá la lógica y UI real de plantillas, por ahora solo placeholder visual
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Plantillas WA</h1>
      <div className="bg-white rounded-lg shadow p-6 flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <h2 className="font-semibold mb-2">Plantillas Twilio</h2>
            <div className="bg-muted rounded p-4">[Lista de plantillas aquí]</div>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold mb-2">Configurar envío</h2>
            <div className="bg-muted rounded p-4">[Formulario de envío aquí]</div>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold mb-2">Contactos</h2>
            <div className="bg-muted rounded p-4">[Lista de contactos aquí]</div>
          </div>
        </div>
      </div>
    </div>
  )
}
