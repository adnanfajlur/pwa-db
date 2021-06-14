/* eslint-disable react-hooks/exhaustive-deps */
import { ChangeEvent, Fragment, useRef } from 'react';
import { Container, IconButton, Button, Grid, Paper, Tabs, Tab, TableContainer, Table, TableHead, TableCell, TableBody, TableRow, ButtonProps, CircularProgress } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import DeleteIcon from '@material-ui/icons/Delete';
import faker from 'faker';
import { useState } from 'react';
import { useEffect } from 'react';
import { useSnackbar } from 'notistack';
import QrScanner from 'qr-scanner';
import { exportDB, importInto } from 'dexie-export-import';
import { saveAs } from 'file-saver';
import DbCtx from './db.ctx';
import { CompanyModel, UserModel } from './db';
import useInterval from './use-interval';

interface CustomButtonProps extends ButtonProps {
  loading?: boolean
}

const CustomButton = ({ loading, ...args }: CustomButtonProps) => {
  const disabled = args.disabled || loading

  return (
    <div style={{ position: 'relative' }}>
      <Button {...args} disabled={disabled} />
      {loading && <CircularProgress size={24} style={{ position: 'absolute', top: '50%', left: '50%', marginTop: -12, marginLeft: -12 }} />}
    </div>
  )
}

const NotifBody = (props: { title: string; message: string }) => {
  return (
    <div>
      {props.title}
      <br />
      {props.message}
    </div>
  )
}

const Companies = (props: { hidden?: boolean }) => {
  const { db } = DbCtx.useContainer()
  const { enqueueSnackbar } = useSnackbar()

  const [data, setData] = useState<CompanyModel[]>([])

  const handleGetData = async () => {
    try {
      const companies = await db.companies.orderBy('id').reverse().toArray()
      setData(companies)
    } catch (error) {
      enqueueSnackbar('Something went wrong', { variant: 'error' })
    }
  }

  const handleRemoveCompany = async (id: number) => {
    const company = data.find(n => n.id === id)
    try {
      if (!company) throw new Error('Company is not found')

      await db.companies.delete(company.id!)
      enqueueSnackbar(<NotifBody title="Success remove company" message={company.name} />, { variant: 'success' })
    } catch (error) {
      console.log('handleRemoveCompany', error)
      if (error.message === 'Company is not found') {
        enqueueSnackbar('Company is not found', { variant: 'error' })
      } else {
        enqueueSnackbar(<NotifBody title="Failed remove company" message={company?.name!} />, { variant: 'error' })
      }
    }
  }

  useEffect(() => {
    handleGetData()
    db.on('changes', (e) => {
      if (e.some(n => n.table === 'companies')) {
        handleGetData()
      }
    })
  }, [])

  if (props.hidden) return null

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((n) => {
            return (
              <TableRow key={n.id}>
                <TableCell>{n.id}</TableCell>
                <TableCell>{n.name}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleRemoveCompany(n.id!)}>
                    <DeleteIcon fontSize="small"  />
                  </IconButton>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

const Users = (props: { hidden?: boolean }) => {
  const { db } = DbCtx.useContainer()
  const { enqueueSnackbar } = useSnackbar()

  const [data, setData] = useState<UserModel[]>([])

  const handleGetData = async () => {
    try {
      const users = await db.users.orderBy('id').reverse().toArray()
      // @ts-ignore TODO: currently anyOf require void[]
      const companies = await db.companies.where('id').anyOf(users.map(n => n.companyId).filter(n => Boolean(n))).toArray()

      setData(users.map(n => ({
        ...n,
        company: companies.find(x => x.id === n.companyId),
      })))
    } catch (error) {
      enqueueSnackbar('Something went wrong', { variant: 'error' })
    }
  }

  const handleRemoveUser = async (id: number) => {
    const user = data.find(n => n.id === id)
    try {
      if (!user) throw new Error('User is not found')

      await db.users.delete(user.id!)
      enqueueSnackbar(<NotifBody title="Success remove user" message={user.name} />, { variant: 'success' })
    } catch (error) {
      console.log('handleRemoveCompany', error)
      if (error.message === 'User is not found') {
        enqueueSnackbar('User is not found', { variant: 'error' })
      } else {
        enqueueSnackbar(<NotifBody title="Failed remove user" message={user?.name!} />, { variant: 'error' })
      }
    }
  }

  useEffect(() => {
    handleGetData()
    db.on('changes', (e) => {
      if (e.some(n => n.table === 'users')) {
        handleGetData()
      }
    })
  }, [])

  if (props.hidden) return null

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Company</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((n) => {
            return (
              <TableRow key={n.id}>
                <TableCell>{n.id}</TableCell>
                <TableCell>{n.name}</TableCell>
                <TableCell>{n.email}</TableCell>
                <TableCell>{n.company?.name || '-'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleRemoveUser(n.id!)}>
                    <DeleteIcon fontSize="small"  />
                  </IconButton>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

interface StorageItem { name: string; size: number }

const StorageInfo = (props: { hidden?: boolean }) => {
  const [data, setData] = useState<StorageItem[]>([])
  const [isPersisted, setIsPersisted] = useState(true)

  const handleCheckCompability = async () => {
    const checkIsPersisted = await navigator.storage?.persisted()
    if (!checkIsPersisted) {
      const isPersisted = await navigator.storage?.persist()
      setIsPersisted(isPersisted)
    }
  }

  const handleGetData = async () => {
    const info = await navigator.storage?.estimate()
    if (info) {
      const temp: StorageItem[] = []
  
      temp.push({ name: 'Quota', size: info.quota || 0 })
      temp.push({ name: 'Usage', size: info.usage || 0 })
      // @ts-ignore usageDetails doesn't typeed on storage.estimate
      temp.push({ name: 'Usage on indexedDB', size: info?.usageDetails?.indexedDB || 0 })
  
      setData(temp)
    }
  }

  const formatByteToMega = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = 2 < 0 ? 0 : 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  useEffect(() => {
    handleGetData()
    handleCheckCompability()
  }, [])

  useInterval(handleGetData, 1000)
  
  if (props.hidden) return null

  if (!navigator.storage) {
    return (
      <Paper>
        <Alert severity="error">Oops.. Currently your browser doesn't support storage API</Alert>
      </Paper>
    )
  }

  return (
    <Fragment>
      <Paper style={{ marginBottom: 16 }}>
        {isPersisted && <Alert severity="info">Storage will not be cleared except by explicit user action.</Alert>}
        {!isPersisted && <Alert severity="warning">Storage may be cleared by the UA under storage pressure, Please allow the storage permission.</Alert>}
      </Paper>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell style={{ width: 280 }}>Name</TableCell>
              <TableCell>Size</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((n) => {
              return (
                <TableRow key={n.name}>
                  <TableCell>{n.name}</TableCell>
                  <TableCell>{formatByteToMega(n.size)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Fragment>
  )
}

const QrCodeScan = (props: { hidden?: boolean }) => {
  const { enqueueSnackbar } = useSnackbar()

  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null)
  const [isHasCamera, setIsHasCamera] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [result, setResult] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)

  const handleDetectCamera = async () => {
    const hasCamera = await QrScanner.hasCamera()
    setIsHasCamera(hasCamera)

    if (videoRef.current) {
      const scanner = new QrScanner(videoRef.current, res => {
        setResult(res)
        scanner.stop()
        setIsCameraOpen(false)
      })
      setQrScanner(scanner)
    }
  }

  const handleOpenCamera = async () => {
    if (videoRef.current) {
      setResult('')
      qrScanner?.start()
      setIsCameraOpen(true)
    } else {
      enqueueSnackbar('Please check your camera', { variant: 'warning' })
    }
  }

  const handleStopCamera = () => {
    if (videoRef?.current) {
      if (qrScanner) {
        qrScanner.stop()
      }
      setIsCameraOpen(false)
    }
  }

  useEffect(() => {
    handleDetectCamera()
  }, [])

  useEffect(() => {
    handleStopCamera()
  }, [props.hidden])

  if (!isHasCamera && !props.hidden) {
    return (
      <Paper>
        <Alert severity="error">Oops.. your camera isn't detected, Please check and allow the camera permission on your browser.</Alert>
      </Paper>
    )
  }

  return (
    <Paper square style={{ padding: 32, display: props.hidden ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {Boolean(result.length) && <Alert variant="outlined" severity="success" style={{ marginBottom: 32, maxWidth: 620 }}>{result}</Alert>}

      {!isCameraOpen && <Button variant="contained" color="primary" onClick={() => handleOpenCamera()}>Start Scanning</Button>}

      <video style={{ width: 'auto', maxWidth: 'calc(100vw - 82px)', display: isCameraOpen ? 'block' : 'none' }} ref={videoRef} />

      {isCameraOpen && <Button variant="contained" color="primary" onClick={() => handleStopCamera()} style={{ marginTop: 12 }}>Stop</Button>}
    </Paper>
  )
}

const App = () => {
  const { db } = DbCtx.useContainer()
  const { enqueueSnackbar } = useSnackbar()

  const [tabIdx, setTabIdx] = useState(0)
  const [loadingAddCompany, setLoadingAddCompany] = useState(false)
  const [loadingAddUser, setLoadingAddUser] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)

  const importRef = useRef<HTMLInputElement>(null)

  const handleAddCompany = async () => {
    setLoadingAddCompany(true)
    const company: CompanyModel = { name: `${faker.company.companyName()} ${faker.company.companySuffix()}` }
    try {
      // await sleep(1000) // to show loading indicator XD
      await db.companies.add(company)
      enqueueSnackbar(<NotifBody title="Success add company" message={company.name} />, { variant: 'success' })
    } catch (error) {
      console.log('handleAddCompany', error)
      enqueueSnackbar(<NotifBody title="Failed add company" message={company.name} />, { variant: 'error' })
    }
    setLoadingAddCompany(false)
  }

  const handleAddUser = async () => {
    setLoadingAddUser(true)
    const user: UserModel = { name: faker.name.findName(), email: faker.internet.email() }
    try {
      // await sleep(1000)
      const companyCount = await db.companies.count()
      const companies = await db.companies.offset(Math.floor(Math.random() * (companyCount - 1) + 1)).limit(1).toArray()
      if (companies.length) user.companyId = companies[0].id

      await db.users.add(user)
      enqueueSnackbar(<NotifBody title="Success add user" message={user.name} />, { variant: 'success' })
    } catch (error) {
      console.log('handleAddUser', error)
      enqueueSnackbar(<NotifBody title="Failed add user" message={user.name} />, { variant: 'error' })
    }
    setLoadingAddUser(false)
  }

  const handleResetDb = async () => {
    await db.delete()
    window.location.reload()
  }

  const handleExportDb = async () => {
    const blob = await exportDB(db)
    saveAs(blob, 'pwa.db')
  }

  const handleImportDb = async (e: ChangeEvent<HTMLInputElement>) => {
    setLoadingImport(true)
    try {
      const file = e.target.files?.length && e.target.files[0]
      if (file) {
        await importInto(db, file, { clearTablesBeforeImport: true })
        enqueueSnackbar('Import DB Successfully', { variant: 'success' })
      }
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' })
    }
    setLoadingImport(false)
  }

  useEffect(() => {
    db.on('changes', (e) => {
      if (e.some(n => n.table === 'companies')) setTabIdx(0)
      if (e.some(n => n.table === 'users')) setTabIdx(1)
    })
  }, [])

  return (
    <Container maxWidth="lg" style={{ padding: '32px 16px' }}>
      <input ref={importRef} type="file" accept="db" onChange={handleImportDb} style={{ display: 'none' }} />
      <Grid container spacing={2}>
        <Grid item>
          <CustomButton loading={loadingAddCompany} onClick={handleAddCompany} variant="contained" color="primary">Add Company</CustomButton>
        </Grid>
        <Grid item>
          <CustomButton loading={loadingAddUser} onClick={handleAddUser} variant="contained" color="primary">Add User</CustomButton>
        </Grid>
        <Grid item>
          <CustomButton onClick={handleResetDb} variant="contained" color="primary">Reset</CustomButton>
        </Grid>
        <Grid item>
          <CustomButton onClick={handleExportDb} variant="contained" color="primary">Export</CustomButton>
        </Grid>
        <Grid item>
          <CustomButton loading={loadingImport} onClick={() => importRef.current?.click()} variant="contained" color="primary">Import</CustomButton>
        </Grid>
      </Grid>

      <div style={{ height: 32 }} />
      <Paper square>
        <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)} indicatorColor="primary" textColor="primary">
          <Tab label="Companies" />
          <Tab label="Users" />
          <Tab label="Storage Info" />
          <Tab label="Qr Code Scanner" />
        </Tabs>
      </Paper>

      <div style={{ height: 8 }} />
      <Companies hidden={tabIdx !== 0} />
      <Users hidden={tabIdx !== 1} />
      <StorageInfo hidden={tabIdx !== 2} />
      <QrCodeScan hidden={tabIdx !== 3} />
    </Container>
  )
}

export default App;
