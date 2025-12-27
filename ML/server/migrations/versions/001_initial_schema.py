"""Initial database schema

Revision ID: 001
Revises: 
Create Date: 2024-12-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial database schema"""
    
    # Create bus_stops table
    op.create_table('bus_stops',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('address', sa.String(500), nullable=False),
        sa.Column('amenities', sa.JSON(), nullable=True),
        sa.Column('daily_passenger_count', sa.Integer(), nullable=True),
        sa.Column('is_accessible', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_bus_stops_location', 'bus_stops', ['latitude', 'longitude'])
    op.create_index('idx_bus_stops_name', 'bus_stops', ['name'])
    
    # Create routes table
    op.create_table('routes',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('operator_id', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('optimization_score', sa.Float(), nullable=True),
        sa.Column('estimated_travel_time', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_routes_operator', 'routes', ['operator_id'])
    op.create_index('idx_routes_active', 'routes', ['is_active'])
    
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('profile', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])
    
    # Create population_density_data table
    op.create_table('population_density_data',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('region', sa.String(200), nullable=False),
        sa.Column('data_source', sa.String(200), nullable=False),
        sa.Column('collected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('north_bound', sa.Float(), nullable=False),
        sa.Column('south_bound', sa.Float(), nullable=False),
        sa.Column('east_bound', sa.Float(), nullable=False),
        sa.Column('west_bound', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_population_region', 'population_density_data', ['region'])
    op.create_index('idx_population_bounds', 'population_density_data', ['north_bound', 'south_bound', 'east_bound', 'west_bound'])
    
    # Create density_points table
    op.create_table('density_points',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('population_data_id', sa.String(36), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('population', sa.Integer(), nullable=False),
        sa.Column('demographic_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['population_data_id'], ['population_density_data.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_density_points_location', 'density_points', ['latitude', 'longitude'])
    op.create_index('idx_density_points_population', 'density_points', ['population'])
    
    # Create optimization_results table
    op.create_table('optimization_results',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('original_route_id', sa.String(36), nullable=False),
        sa.Column('population_data_id', sa.String(36), nullable=False),
        sa.Column('optimized_route_data', sa.JSON(), nullable=False),
        sa.Column('time_improvement', sa.Float(), nullable=False),
        sa.Column('distance_reduction', sa.Float(), nullable=False),
        sa.Column('passenger_coverage_increase', sa.Float(), nullable=False),
        sa.Column('cost_savings', sa.Float(), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['original_route_id'], ['routes.id'], ),
        sa.ForeignKeyConstraint(['population_data_id'], ['population_density_data.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_optimization_route', 'optimization_results', ['original_route_id'])
    op.create_index('idx_optimization_generated', 'optimization_results', ['generated_at'])
    
    # Create route_stops association table
    op.create_table('route_stops',
        sa.Column('route_id', sa.String(36), nullable=False),
        sa.Column('bus_stop_id', sa.String(36), nullable=False),
        sa.Column('stop_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['bus_stop_id'], ['bus_stops.id'], ),
        sa.ForeignKeyConstraint(['route_id'], ['routes.id'], ),
        sa.PrimaryKeyConstraint('route_id', 'bus_stop_id')
    )


def downgrade() -> None:
    """Drop all tables"""
    op.drop_table('route_stops')
    op.drop_table('optimization_results')
    op.drop_table('density_points')
    op.drop_table('population_density_data')
    op.drop_table('users')
    op.drop_table('routes')
    op.drop_table('bus_stops')