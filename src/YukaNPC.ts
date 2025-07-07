import { Vehicle, SeekBehavior, ArriveBehavior, FollowPathBehavior, Path, Vector3 as YukaVector3, GameEntity } from 'yuka';
import { Vector3, Object3D } from 'three';
import NPC from './NPC';

class YukaNPC {
  npc: NPC;               // NPC visual (Three.js)
  vehicle: Vehicle;       // Agente Yuka
  path: Path;             // Caminho para patrulha
  followPathBehavior: FollowPathBehavior;
  seekBehavior: SeekBehavior;
  arriveBehavior: ArriveBehavior;
  isFollowingPlayer: boolean = false;

  constructor(npc: NPC) {
    this.npc = npc;

    // Cria o agente Yuka
    this.vehicle = new Vehicle();
   this.vehicle.setRenderComponent(npc, this.syncVisualWithYuka);

    // Ajusta parâmetros
    this.vehicle.maxSpeed = 3;
    this.vehicle.maxForce = 10;

    // Comportamento de patrulha (caminho vazio por enquanto)
    this.path = new Path();
    this.followPathBehavior = new FollowPathBehavior(this.path, 0.5);
    this.vehicle.steering.add(this.followPathBehavior);

    // Comportamento de seek para seguir o player
    this.seekBehavior = new SeekBehavior();
    this.arriveBehavior = new ArriveBehavior();

    // Inicialmente está patrulhando
    this.isFollowingPlayer = false;
  }

syncVisualWithYuka = (entity: GameEntity, renderComponent: Object3D) => {
        const vehicle = entity as Vehicle;
        renderComponent.position.copy(vehicle.position);
        renderComponent.quaternion.copy(vehicle.rotation);
    };
  // Define pontos para patrulha
  setPatrolPoints(points: Vector3[]) {
    this.path.clear();
    points.forEach(p => this.path.add(new YukaVector3(p.x, p.y, p.z)));
  }

  // Ativa o modo seguir player
  followPlayer(playerPosition: Vector3) {
    this.isFollowingPlayer = true;
    this.seekBehavior.target.copy(new YukaVector3(playerPosition.x, playerPosition.y, playerPosition.z));
    this.vehicle.steering.remove(this.followPathBehavior);
    this.vehicle.steering.add(this.seekBehavior);
  }

  // Ativa o modo patrulha
  patrol() {
    this.isFollowingPlayer = false;
    this.vehicle.steering.remove(this.seekBehavior);
    this.vehicle.steering.add(this.followPathBehavior);
  }

  // Atualiza o agente Yuka
  update(delta: number, playerPosition: Vector3) {
    // Verifica distância para alternar comportamento
    const dist = this.npc.position.distanceTo(playerPosition);
    const attackRange = 3;
    const detectionRange = 10;

    if (dist < attackRange) {
      // Aqui você pode ativar o ataque (chamar método do NPC)
      this.npc.attack();
    } else if (dist < detectionRange) {
      // Persegue o jogador
      this.followPlayer(playerPosition);
    } else {
      // Volta para patrulha
      if (!this.isFollowingPlayer) {
        this.patrol();
      }
    }

    // Atualiza agente
    this.vehicle.update(delta);
  }
}

export default YukaNPC;
