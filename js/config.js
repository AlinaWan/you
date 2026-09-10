export const config = {
    fontSize: 22,
    fontWeight: 600,
    fontFamily:
        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

    /*
     * Approximate spacing between words.
     * As more words are added, the occupied world expands.
     */
    spawnDistance: 180,

    /*
     * Spatial hash cell size.
     */
    gridSize: 250,

    /*
     * Words within this distance of the viewport are simulated.
     */
    simulationPadding: 500,

    /*
     * Words within this distance of the viewport are rendered.
     */
    renderPadding: 150,

    currentSpeed: 0.015,
    minSpeed: 0.18,
    friction: 0.985,
    angularFriction: 0.96,
    mouseForce: 1.5,
    mouseRadius: 200,
    panSpeed: 8,
    collisionRestitution: 0.6
};