import { RouterProvider } from 'react-router-dom'

import { router } from './router'
import { ConvexProvider } from './lib/ConvexProvider'
import { ToastProvider } from './lib/toast'

export { AppRoutes } from './AppRoutes'

/**
 * Root App component wrapping ConvexProvider and RouterProvider for fleet data access
 */
export default function App() {
  return (
    <ConvexProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ConvexProvider>
  )
}
