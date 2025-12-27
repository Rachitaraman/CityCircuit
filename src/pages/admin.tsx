import React from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { Layout } from '../components/layout/Layout';

const AdminPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Admin Dashboard - CityCircuit</title>
        <meta 
          name="description" 
          content="CityCircuit admin dashboard for managing routes, users, and system configuration" 
        />
      </Head>
      
      <Layout>
        <AdminDashboard />
      </Layout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {},
  };
};

export default AdminPage;