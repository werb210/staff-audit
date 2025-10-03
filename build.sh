#!/bin/bash
export NODE_OPTIONS="--max_old_space_size=2048"
echo "=== BUILDING WITH INCREASED MEMORY ==="
echo "Node memory: $NODE_OPTIONS"
npm run build