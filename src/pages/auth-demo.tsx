import React from 'react';
import Head from 'next/head';
import { Layout } from '../components/layout/Layout';
import { ProtectedRoute, RoleGate } from '../components/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';

export default function AuthDemoPage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <>
      <Head>
        <title>Authentication Demo - CityCircuit</title>
        <meta name="description" content="Demonstration of authentication and role-based access control" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Layout>
        <div className="space-y-8">
          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <Badge variant={isAuthenticated ? 'success' : 'danger'}>
                    {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                  </Badge>
                  <p className="text-sm text-neutral-600 mt-2">Login Status</p>
                </div>
                {user && (
                  <>
                    <div className="text-center">
                      <Badge variant="secondary">{user.name}</Badge>
                      <p className="text-sm text-neutral-600 mt-2">User Name</p>
                    </div>
                    <div className="text-center">
                      <Badge variant={
                        user.role === 'admin' ? 'danger' :
                        user.role === 'operator' ? 'warning' : 'secondary'
                      }>
                        {user.role}
                      </Badge>
                      <p className="text-sm text-neutral-600 mt-2">User Role</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role-Based Content Examples */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Admin Only Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Only Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RoleGate
                  allowedRoles={['admin']}
                  fallback={
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-neutral-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      <p className="text-neutral-600">Admin access required</p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Only administrators can view this content
                      </p>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">System Administration</h4>
                      <p className="text-sm text-red-700">
                        This section contains sensitive system administration tools and settings.
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        User Management
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        System Configuration
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Security Settings
                      </li>
                    </ul>
                  </div>
                </RoleGate>
              </CardContent>
            </Card>

            {/* Operator Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Operator Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RoleGate
                  allowedRoles={['admin', 'operator']}
                  fallback={
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-neutral-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      <p className="text-neutral-600">Operator access required</p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Only operators and admins can view this content
                      </p>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">Route Management</h4>
                      <p className="text-sm text-yellow-700">
                        Tools for managing bus routes and optimizing operations.
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Create & Edit Routes
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Route Optimization
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Performance Analytics
                      </li>
                    </ul>
                  </div>
                </RoleGate>
              </CardContent>
            </Card>
          </div>

          {/* Public Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Public Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Route Information</h4>
                <p className="text-sm text-blue-700">
                  This content is available to all users, including those who are not logged in.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary-600">150+</p>
                  <p className="text-xs text-neutral-600">Active Routes</p>
                </div>
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <p className="text-2xl font-bold text-secondary-600">2.5M</p>
                  <p className="text-xs text-neutral-600">Daily Passengers</p>
                </div>
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <p className="text-2xl font-bold text-accent-600">85%</p>
                  <p className="text-xs text-neutral-600">Avg Optimization</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Protected Route Example */}
          <ProtectedRoute allowedRoles={['admin', 'operator']}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Protected Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Success!</h4>
                  <p className="text-sm text-green-700">
                    You have access to this protected content because you have the required role permissions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </ProtectedRoute>

          {/* Demo Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p>
                  This page demonstrates the authentication and role-based access control system. 
                  Try logging in with different user roles to see how the content changes:
                </p>
                <ul>
                  <li><strong>Admin:</strong> admin@citycircuit.com / password123</li>
                  <li><strong>Operator:</strong> operator@citycircuit.com / password123</li>
                  <li><strong>Passenger:</strong> passenger@citycircuit.com / password123</li>
                </ul>
                <p>
                  Notice how different sections become available or restricted based on your role.
                  The system implements proper role-based access control throughout the application.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}