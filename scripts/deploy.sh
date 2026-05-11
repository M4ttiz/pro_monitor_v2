#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="pro-monitor"
DOCKER_COMPOSE="docker-compose"

# Functions
print_header() {
    echo -e "\n${GREEN}=== $1 ===${NC}\n"
}

print_error() {
    echo -e "${RED}❌ Error: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_requirements() {
    print_header "Checking Requirements"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        echo "Install Docker from: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_success "Docker is installed: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        echo "Install Docker Compose from: https://docs.docker.com/compose/install/"
        exit 1
    fi
    print_success "Docker Compose is installed: $(docker-compose --version)"

    # Check .env file
    if [ ! -f .env ]; then
        print_warning ".env file not found, copying from .env.example"
        cp .env.example .env
        print_success ".env file created from template"
    fi
}

build_images() {
    print_header "Building Docker Images"
    
    if $DOCKER_COMPOSE build; then
        print_success "Images built successfully"
    else
        print_error "Failed to build images"
        exit 1
    fi
}

start_services() {
    print_header "Starting Services"
    
    if $DOCKER_COMPOSE up -d; then
        print_success "Services started"
        echo ""
        echo "Waiting for services to be ready..."
        sleep 5
        
        print_header "Service Status"
        $DOCKER_COMPOSE ps
        
        print_header "Access URLs"
        echo "Frontend:  http://localhost:3000"
        echo "Backend:   http://localhost:3001"
        echo "Health:    http://localhost:3001/health"
        echo ""
        echo "View logs with: $0 logs"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

stop_services() {
    print_header "Stopping Services"
    
    if $DOCKER_COMPOSE stop; then
        print_success "Services stopped"
    else
        print_error "Failed to stop services"
        exit 1
    fi
}

restart_services() {
    print_header "Restarting Services"
    
    if $DOCKER_COMPOSE restart; then
        print_success "Services restarted"
        $DOCKER_COMPOSE ps
    else
        print_error "Failed to restart services"
        exit 1
    fi
}

view_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        print_header "Viewing All Logs (Ctrl+C to exit)"
        $DOCKER_COMPOSE logs -f
    else
        print_header "Viewing $service Logs (Ctrl+C to exit)"
        $DOCKER_COMPOSE logs -f "$service"
    fi
}

show_status() {
    print_header "Service Status"
    $DOCKER_COMPOSE ps
}

run_migrations() {
    print_header "Running Database Migrations"
    
    echo "Executing Prisma migrations..."
    if $DOCKER_COMPOSE exec -T backend pnpm prisma migrate deploy; then
        print_success "Migrations completed"
    else
        print_error "Migration failed - database might need setup"
        echo "Try running: $0 reset"
    fi
}

reset_all() {
    print_header "⚠️  FULL RESET - This will delete all data!"
    echo -e "${RED}This action cannot be undone!${NC}"
    read -p "Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_warning "Reset cancelled"
        return
    fi
    
    print_header "Removing All Containers and Volumes"
    $DOCKER_COMPOSE down -v
    print_success "All containers and volumes removed"
    
    print_header "Rebuilding and Starting"
    build_images
    start_services
}

shell_backend() {
    print_header "Accessing Backend Shell"
    $DOCKER_COMPOSE exec backend sh
}

shell_database() {
    print_header "Accessing Database Shell"
    $DOCKER_COMPOSE exec postgres psql -U pro_monitor -d pro_monitor
}

view_help() {
    cat << EOF
${GREEN}Pro Monitor v2 - Deployment Script${NC}

Usage: $0 <command> [options]

Commands:
  check              Verify Docker and requirements
  build              Build Docker images
  start              Start all services
  stop               Stop all services
  restart            Restart all services
  logs [service]     View logs (optional: backend, frontend, postgres, redis, nginx)
  status             Show service status
  migrate            Run database migrations
  reset              Full reset (WARNING: deletes all data)
  shell-backend      Access backend container shell
  shell-db           Access database shell
  help               Show this help message

Examples:
  $0 check
  $0 build
  $0 start
  $0 logs backend
  $0 stop

Quick Start:
  $0 check
  $0 build
  $0 start

Then visit: http://localhost:3000

EOF
}

# Main script
case "${1:-help}" in
    check)
        check_requirements
        ;;
    build)
        check_requirements
        build_images
        ;;
    start)
        check_requirements
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        view_logs "$2"
        ;;
    status)
        show_status
        ;;
    migrate)
        run_migrations
        ;;
    reset)
        reset_all
        ;;
    shell-backend)
        shell_backend
        ;;
    shell-db)
        shell_database
        ;;
    help|--help|-h)
        view_help
        ;;
    *)
        print_error "Unknown command: $1"
        view_help
        exit 1
        ;;
esac
