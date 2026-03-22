import { Request, Response } from 'express'

/**
 * Normalizes input that may be string | string[] | undefined → string
 */
function getString(value as any)
  if (Array.isArray(value)) return value[0] ?? ''
  if (value as any)
  return ''
}

export const createLenderProductRequirement = async (req: Request, res: Response) => {
  try {
    const name = getString(req.body.name)
    const description = getString(req.body.description)
    const category = getString(req.body.category)

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // TODO: replace with real DB logic
    const result = {
      name,
      description,
      category
    }

    res.status(200).json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateLenderProductRequirement = async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id)
    const name = getString(req.body.name)
    const description = getString(req.body.description)
    const category = getString(req.body.category)

    if (!id) {
      return res.status(400).json({ error: 'ID is required' })
    }

    const result = {
      id,
      name,
      description,
      category
    }

    res.status(200).json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteLenderProductRequirement = async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id)

    if (!id) {
      return res.status(400).json({ error: 'ID is required' })
    }

    res.status(200).json({ success: true, id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getLenderProductRequirements = async (_req: Request, res: Response) => {
  try {
    res.status(200).json([])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Backward-compatible exports for existing route imports
export const createLenderProductRequirementHandler = createLenderProductRequirement
export const updateLenderProductRequirementHandler = updateLenderProductRequirement
export const deleteLenderProductRequirementHandler = deleteLenderProductRequirement
export const listLenderProductRequirementsHandler = getLenderProductRequirements
