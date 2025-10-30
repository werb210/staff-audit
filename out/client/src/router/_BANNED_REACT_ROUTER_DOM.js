// 🚫 REACT-ROUTER-DOM IS BANNED IN THIS APP
// Use wouter instead for routing
throw new Error(`
❌ react-router-dom is banned in this app.

Why? It causes useNavigate() crashes and conflicts with wouter.

✅ Use wouter instead:
  import { useLocation, useRoute } from 'wouter'
  
✅ For navigation:
  const [, setLocation] = useLocation()
  setLocation('/new-path')
  
See existing components for examples.
`);
export {};
