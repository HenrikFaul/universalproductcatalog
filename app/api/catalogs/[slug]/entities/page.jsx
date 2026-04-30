"use client"

import { useState } from "react"

export default function EntityManager({ params }) {
  const { slug } = params

  const [type, setType] = useState("productSpecifications")
  const [json, setJson] = useState("{}")

  const call = async (method, payload) => {
    await fetch(`/api/catalogs/${slug}/entities`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    alert("Saved")
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Entity Manager</h1>

      <select onChange={e => setType(e.target.value)}>
        <option value="productSpecifications">Product Spec</option>
        <option value="productOfferings">Product Offering</option>
        <option value="products">Product / Inventory</option>
      </select>

      <textarea
        value={json}
        onChange={e => setJson(e.target.value)}
        style={{ width: "100%", height: 300 }}
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={() =>
          call("POST", { type, entity: JSON.parse(json) })
        }>
          Create
        </button>

        <button onClick={() =>
          call("PUT", { type, entity: JSON.parse(json) })
        }>
          Update
        </button>

        <button onClick={() => {
          const { id } = JSON.parse(json)
          call("DELETE", { type, id })
        }}>
          Delete
        </button>
      </div>
    </div>
  )
}
